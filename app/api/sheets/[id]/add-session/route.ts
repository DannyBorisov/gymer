import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"
import { buildRow, COLUMNS, formatDateForSheet } from "@/app/lib/columns"

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
    const { sessionName, date, exercises } = body

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheet = spreadsheet.data.sheets?.[0]
    const sheetName = sheet?.properties?.title || "Sheet1"

    // Get current data to check if there's existing data (for separator row)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:H`,
    })

    const existingRows = response.data.values || []
    const hasExistingData = existingRows.length > 1 // More than just header row

    // Build rows for the new session using canonical column mapping
    const rows: string[][] = []

    // Add empty row between sessions for visual separation (if there's existing data)
    if (hasExistingData) {
      rows.push(buildRow({})) // Empty row
    }

    // Format date from yyyy-mm-dd to dd.mm.yyyy for the sheet
    const formattedDate = formatDateForSheet(date)

    let isFirstRow = true
    for (const ex of exercises as { exercise: string; sets: string; targetReps: string; targetRir: string }[]) {
      const setCount = parseInt(ex.sets) || 1

      for (let i = 0; i < setCount; i++) {
        rows.push(
          buildRow({
            date: isFirstRow ? formattedDate : "",
            session: sessionName,
            exercise: ex.exercise,
            targetReps: ex.targetReps,
            targetRir: ex.targetRir,
          })
        )
        isFirstRow = false
      }
    }

    // Get sheet ID for formatting
    const sheetId = sheet?.properties?.sheetId || 0

    // Let Google Sheets find the correct append position automatically
    // Using A1 as range tells the API to append after all existing data in the table
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS", // Insert new rows instead of overwriting
      requestBody: {
        values: rows,
      },
    })

    // Extract the starting row from the append result
    const updatedRange = appendResult.data.updates?.updatedRange || ""
    const startRowMatch = updatedRange.match(/!A(\d+):/)
    const startRow = startRowMatch ? parseInt(startRowMatch[1]) : existingRows.length + 1

    // Clear formatting on appended rows to avoid inheriting header styles
    if (startRowMatch) {
      const startRowIndex = parseInt(startRowMatch[1]) - 1 // Convert to 0-based
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex,
                  endRowIndex: startRowIndex + rows.length,
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

    return NextResponse.json({
      success: true,
      startRow,
    })
  } catch (error) {
    console.error("Error adding session:", error)
    return NextResponse.json(
      { error: "Failed to add workout" },
      { status: 500 }
    )
  }
}
