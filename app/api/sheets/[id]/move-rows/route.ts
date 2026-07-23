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
    const { sourceStartRow, sourceEndRow, destinationRow } = body

    // Validate inputs (all are 1-based row numbers)
    if (!sourceStartRow || !sourceEndRow || !destinationRow) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata to find sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0

    // Convert 1-based row numbers to 0-based indices for the API
    // startRow and endRow are both 1-based inclusive (e.g., rows 6-8 means rows 6, 7, 8)
    // Google Sheets API uses 0-based indices with exclusive end
    const sourceStartIndex = sourceStartRow - 1
    const sourceEndIndex = sourceEndRow // 1-based row 8 = 0-based exclusive index 8 (includes rows up to 7)
    const destinationIndex = destinationRow - 1

    // Use moveDimension to move rows, then insert a separator row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            moveDimension: {
              source: {
                sheetId,
                dimension: "ROWS",
                startIndex: sourceStartIndex,
                endIndex: sourceEndIndex,
              },
              destinationIndex,
            },
          },
        ],
      },
    })

    // Calculate where to insert a separator row
    // After moving, we need a blank row between the moved workout and adjacent ones
    const numRowsMoved = sourceEndIndex - sourceStartIndex
    let separatorIndex: number

    if (destinationIndex < sourceStartIndex) {
      // Moved up: insert separator after the moved rows
      separatorIndex = destinationIndex + numRowsMoved
    } else {
      // Moved down: insert separator before the moved rows (at their new position)
      // When moving down, the destination shifts because source rows are removed first
      separatorIndex = destinationIndex - numRowsMoved
    }

    // Insert a blank row as separator and clear its formatting
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: separatorIndex,
                endIndex: separatorIndex + 1,
              },
              inheritFromBefore: false,
            },
          },
          {
            // Clear formatting on the inserted row
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: separatorIndex,
                endRowIndex: separatorIndex + 1,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error moving rows:", error)
    return NextResponse.json(
      { error: "Failed to move rows" },
      { status: 500 }
    )
  }
}
