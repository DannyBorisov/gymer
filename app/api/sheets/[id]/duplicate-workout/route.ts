import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"
import { buildRow, formatDateForSheet, normalizeRow, COLUMNS } from "@/app/lib/columns"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id: spreadsheetId } = await params

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { startRow, endRow } = body

    if (!startRow || !endRow) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheet = spreadsheet.data.sheets?.[0]
    const sheetName = sheet?.properties?.title || "Sheet1"

    // Read the rows to duplicate
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A${startRow}:H${endRow}`,
    })

    const allRows = response.data.values || []

    // Normalize and filter out empty rows (rows without session or exercise data)
    const rowsToDuplicate = allRows
      .map(normalizeRow)
      .filter((row) => {
        const session = row[COLUMNS.SESSION]
        const exercise = row[COLUMNS.EXERCISE]
        return session.trim() !== "" || exercise.trim() !== ""
      })

    if (rowsToDuplicate.length === 0) {
      return NextResponse.json(
        { error: "No rows to duplicate" },
        { status: 400 }
      )
    }

    // Create new rows with today's date and cleared performance data
    const today = formatDateForSheet(new Date().toISOString().split("T")[0])
    const newRows: string[][] = []

    // Add separator row first
    newRows.push(buildRow({}))

    let isFirstDataRow = true
    rowsToDuplicate.forEach((row) => {
      newRows.push(
        buildRow({
          date: isFirstDataRow ? today : "",
          session: row[COLUMNS.SESSION],
          exercise: row[COLUMNS.EXERCISE],
          targetReps: row[COLUMNS.TARGET_REPS],
          targetRir: row[COLUMNS.TARGET_RIR],
          // Clear weight, reps achieved, notes for the new workout
          weight: "",
          repsAchieved: "",
          notes: "",
        })
      )
      isFirstDataRow = false
    })

    // Get sheet ID for formatting
    const sheetId = sheet?.properties?.sheetId || 0

    // Append after the original workout
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: newRows,
      },
    })

    // Get the range where rows were appended and clear formatting
    const updatedRange = appendResult.data.updates?.updatedRange || ""
    const rangeMatch = updatedRange.match(/!A(\d+):/)
    if (rangeMatch) {
      const startRowIndex = parseInt(rangeMatch[1]) - 1 // Convert to 0-based

      // Clear formatting on appended rows (especially the separator row)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex,
                  endRowIndex: startRowIndex + newRows.length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 1, green: 1, blue: 1 },
                    textFormat: { bold: false },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            },
          ],
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error duplicating workout:", error)
    return NextResponse.json(
      { error: "Failed to duplicate workout" },
      { status: 500 }
    )
  }
}
