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

    // Get current data to find the last row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    })

    const lastRow = (response.data.values?.length || 1) + 1

    // Build rows for the new session
    // Columns: A=Session, B=Exercise, C=Target Reps, D=Target RIR, E=Date, F=Weight, G=Reps, H=Notes
    const rows = exercises.map((ex: { exercise: string; targetReps: string; targetRir: string }, index: number) => [
      sessionName,
      ex.exercise,
      ex.targetReps,
      ex.targetRir,
      index === 0 ? date : "", // Only put date on first row
      "",
      "",
      "",
    ])

    // Append the new rows
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A${lastRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    })

    return NextResponse.json({
      success: true,
      startRow: lastRow,
    })
  } catch (error) {
    console.error("Error adding session:", error)
    return NextResponse.json(
      { error: "Failed to add session" },
      { status: 500 }
    )
  }
}
