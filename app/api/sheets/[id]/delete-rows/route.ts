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
    const { rowIndices } = body as { rowIndices: number[] }

    if (!rowIndices || rowIndices.length === 0) {
      return NextResponse.json({ error: "No rows specified" }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata to find sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0

    // Sort row indices in descending order to delete from bottom to top
    // This prevents row index shifting issues
    const sortedIndices = [...rowIndices].sort((a, b) => b - a)

    // Create delete requests for each row
    const requests = sortedIndices.map((rowIndex) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: rowIndex - 1, // Convert to 0-based index
          endIndex: rowIndex, // Exclusive end
        },
      },
    }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    })

    return NextResponse.json({ success: true, deletedCount: rowIndices.length })
  } catch (error) {
    console.error("Error deleting rows:", error)
    return NextResponse.json(
      { error: "Failed to delete rows" },
      { status: 500 }
    )
  }
}
