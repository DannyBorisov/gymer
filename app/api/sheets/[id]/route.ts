import { auth } from "@/auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"

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

  // Find column indices (case-insensitive)
  const findIndex = (keyword: string) =>
    headers.findIndex((h) => h?.toLowerCase().includes(keyword.toLowerCase()))

  const sessionIdx = findIndex("session")
  const exerciseIdx = findIndex("exercise")
  const targetRepsIdx = findIndex("target reps")
  const targetRirIdx = headers.findIndex(
    (h) =>
      h?.toLowerCase().includes("target rir") ||
      h?.toLowerCase().includes("rir")
  )
  const weightIdx = findIndex("weight")
  const repsAchievedIdx = headers.findIndex(
    (h) =>
      h?.toLowerCase().includes("reps achieved") ||
      h?.toLowerCase().includes("achieved")
  )
  const notesIdx = findIndex("notes")
  const dateIdx = findIndex("date")

  rows.forEach((row, index) => {
    const sessionValue = row[sessionIdx] || ""

    // Skip empty rows
    if (!sessionValue && !row[exerciseIdx]) {
      return
    }

    const setData: SetData = {
      rowIndex: index + 2, // +2 because: +1 for header row, +1 for 1-based indexing
      session: sessionValue,
      exercise: row[exerciseIdx] || "",
      targetReps: row[targetRepsIdx] || "",
      targetRir: row[targetRirIdx] || "",
      weight: row[weightIdx] || "",
      repsAchieved: row[repsAchievedIdx] || "",
      notes: row[notesIdx] || "",
    }

    // Check if this is a new workout (different session or first row)
    if (!currentWorkout || currentWorkout.session !== sessionValue) {
      // Save previous workout
      if (currentWorkout) {
        workouts.push(currentWorkout)
      }

      // Extract date from first row of workout (if date column exists)
      const dateValue = dateIdx >= 0 ? row[dateIdx] || null : null

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
    } else {
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
