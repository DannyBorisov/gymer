import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"

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
    const { afterRowIndex, sessionName, exercise, targetReps, targetRir } = body

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata to find sheet name and ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheet = spreadsheet.data.sheets?.[0]
    const sheetName = sheet?.properties?.title || "Sheet1"
    const sheetId = sheet?.properties?.sheetId || 0

    // Insert a new row after the specified row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: afterRowIndex, // 0-based, inserts after this row
                endIndex: afterRowIndex + 1,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    })

    // Write the new row data
    // Columns: A=Session, B=Exercise, C=Target Reps, D=Target RIR, E=Date, F=Weight, G=Reps, H=Notes
    const newRowIndex = afterRowIndex + 1 // 1-based for A1 notation
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${newRowIndex}:H${newRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[sessionName, exercise, targetReps, targetRir, "", "", "", ""]],
      },
    })

    return NextResponse.json({
      success: true,
      newRowIndex,
    })
  } catch (error) {
    console.error("Error adding set:", error)
    return NextResponse.json(
      { error: "Failed to add set" },
      { status: 500 }
    )
  }
}
