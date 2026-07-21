import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

interface Exercise {
  name: string
  sets: number
  targetReps: string
  targetRir: string
}

interface Session {
  name: string
  date: string
  exercises: Exercise[]
}

interface CreateProgramRequest {
  programName: string
  sessions: Session[]
}

// Convert yyyy-mm-dd to dd.mm.yyyy
function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return ""
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}.${month}.${year}`
  }
  return dateStr
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: CreateProgramRequest = await request.json()
    const { programName, sessions } = body

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })
    const drive = google.drive({ version: "v3", auth: oauth2Client })

    // Create a new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: programName,
        },
        sheets: [
          {
            properties: {
              title: "Program",
            },
          },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId!
    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId ?? 0

    // Mark this spreadsheet as created by Gymer
    await drive.files.update({
      fileId: spreadsheetId,
      requestBody: {
        appProperties: {
          createdBy: "gymer",
        },
      },
    })

    // Build the data rows (Date is first column)
    const headers = [
      "Date",
      "Session",
      "Exercise",
      "Target Reps",
      "Target RIR",
      "Weight (kg)",
      "Reps Achieved",
      "Notes",
    ]

    const rows: string[][] = [headers]

    for (const sessionData of sessions) {
      for (const exercise of sessionData.exercises) {
        // Create multiple rows based on number of sets
        for (let setNum = 1; setNum <= exercise.sets; setNum++) {
          rows.push([
            setNum === 1 ? formatDateForSheet(sessionData.date) : "", // Date only on first set
            sessionData.name,
            exercise.name,
            exercise.targetReps,
            exercise.targetRir,
            "", // Weight - to be filled
            "", // Reps Achieved - to be filled
            "", // Notes
          ])
        }
      }
    }

    // Write the data to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Program!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    })

    // Format the header row (bold, background color)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 8,
              },
            },
          },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    })
  } catch (error) {
    console.error("Error creating sheet:", error)
    return NextResponse.json(
      { error: "Failed to create sheet" },
      { status: 500 }
    )
  }
}
