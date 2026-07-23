import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"
import { COLUMNS, normalizeRow, COLUMN_COUNT } from "@/app/lib/columns"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id: spreadsheetId } = await params

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: session.accessToken })

    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    // Get spreadsheet metadata to find sheet names
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1"

    // Read all data from the first sheet (expanded range to include date column)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, // Read more columns to capture date
    })

    const rows = response.data.values || []

    if (rows.length === 0) {
      return NextResponse.json({ headers: [], workouts: [] })
    }

    // First row is headers
    const headers = rows[0]
    const dataRows = rows.slice(1)

    // Parse into workouts (contiguous blocks with same session value)
    const workouts = parseWorkouts(dataRows, headers)

    return NextResponse.json({
      spreadsheetTitle: spreadsheet.data.properties?.title,
      sheetName,
      headers,
      workouts,
      totalRows: dataRows.length,
    })
  } catch (error) {
    console.error("Error reading sheet:", error)
    return NextResponse.json(
      { error: "Failed to read sheet" },
      { status: 500 }
    )
  }
}

interface SetData {
  rowIndex: number
  session: string
  exercise: string
  targetReps: string
  targetRir: string
  weight: string
  repsAchieved: string
  notes: string
}

interface Workout {
  id: number
  session: string
  date: string | null
  exercises: SetData[]
  startRow: number
  endRow: number
}

function parseWorkouts(rows: string[][], headers: string[]): Workout[] {
  const workouts: Workout[] = []
  let currentWorkout: Workout | null = null
  let workoutId = 0

  // Use canonical column positions from columns.ts
  // This ensures consistent reading regardless of header names or empty cells
  rows.forEach((rawRow, index) => {
    // Normalize row to ensure it has all columns (handles Google Sheets trimming)
    const row = normalizeRow(rawRow)

    const sessionValue = row[COLUMNS.SESSION]
    const exerciseValue = row[COLUMNS.EXERCISE]

    // Skip empty rows
    if (!sessionValue && !exerciseValue) {
      return
    }

    const setData: SetData = {
      rowIndex: index + 2, // +2 because: +1 for header row, +1 for 1-based indexing
      session: sessionValue,
      exercise: exerciseValue,
      targetReps: row[COLUMNS.TARGET_REPS],
      targetRir: row[COLUMNS.TARGET_RIR],
      weight: row[COLUMNS.WEIGHT],
      repsAchieved: row[COLUMNS.REPS_ACHIEVED],
      notes: row[COLUMNS.NOTES],
    }

    // Extract date from this row
    const dateValue = row[COLUMNS.DATE] || null

    // Check if this is a new workout:
    // - No current workout, OR
    // - Different session name, OR
    // - Same session but has a date (indicates a new workout block)
    const isNewWorkout = !currentWorkout ||
      currentWorkout.session !== sessionValue ||
      (dateValue && currentWorkout.session === sessionValue)

    if (isNewWorkout) {
      // Save previous workout
      if (currentWorkout) {
        workouts.push(currentWorkout)
      }

      // Start new workout
      workoutId++
      currentWorkout = {
        id: workoutId,
        session: sessionValue,
        date: dateValue,
        exercises: [setData],
        startRow: index + 2,
        endRow: index + 2,
      }
    } else if (currentWorkout) {
      // Same session, add to current workout
      currentWorkout.exercises.push(setData)
      currentWorkout.endRow = index + 2
    }
  })

  // Don't forget the last workout
  if (currentWorkout) {
    workouts.push(currentWorkout)
  }

  return workouts
}
