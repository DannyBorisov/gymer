import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"
import { COLUMNS } from "@/app/lib/columns"

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
    const { rowIndex, weight, repsAchieved, notes } = body

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata to find sheet name
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1"

    // Update the row using canonical column positions
    // Convert column indices to letters (A=0, B=1, etc.)
    const weightCol = String.fromCharCode(65 + COLUMNS.WEIGHT)
    const notesCol = String.fromCharCode(65 + COLUMNS.NOTES)

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${weightCol}${rowIndex}:${notesCol}${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[weight, repsAchieved, notes]],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating sheet:", error)
    return NextResponse.json(
      { error: "Failed to update sheet" },
      { status: 500 }
    )
  }
}
