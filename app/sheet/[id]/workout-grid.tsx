"use client"

import { useEffect, useState } from "react"
import { ExerciseCombobox } from "@/app/components/ExerciseCombobox"
import { FloatingInput } from "@/app/components/FloatingInput"

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

interface SheetData {
  spreadsheetTitle: string
  sheetName: string
  headers: string[]
  workouts: Workout[]
  totalRows: number
}

// Helper to count unique exercises in a workout
function getUniqueExercises(sets: SetData[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const set of sets) {
    if (!seen.has(set.exercise)) {
      seen.add(set.exercise)
      unique.push(set.exercise)
    }
  }
  return unique
}

// Helper to check if an exercise is complete (all sets have weight AND reps)
function isExerciseComplete(exerciseName: string, sets: SetData[]): boolean {
  const exerciseSets = sets.filter((s) => s.exercise === exerciseName)
  return exerciseSets.every((s) => s.weight && s.repsAchieved)
}

// Parse date string to Date object (handles dd.mm.yyyy and yyyy-mm-dd formats)
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  const parts = dateStr.split(/[\/\-\.]/)
  if (parts.length === 3) {
    const [first, second, third] = parts.map(Number)

    // Detect format by checking if first part is a year (4 digits) or day (1-2 digits)
    if (first > 1000) {
      // yyyy-mm-dd format
      const date = new Date(first, second - 1, third)
      if (!isNaN(date.getTime())) return date
    } else {
      // dd.mm.yyyy format
      const date = new Date(third, second - 1, first)
      if (!isNaN(date.getTime())) return date
    }
  }

  // Fallback: try native Date parsing
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) return parsed

  return null
}

// Find the closest upcoming workout (today or future)
function findClosestWorkout(workouts: Workout[]): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let closestId: number | null = null
  let closestDiff = Infinity

  for (const workout of workouts) {
    const date = parseDate(workout.date)
    if (!date) continue

    date.setHours(0, 0, 0, 0)
    const diff = date.getTime() - today.getTime()

    // Only consider today or future dates, or most recent past if no future
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff
      closestId = workout.id
    }
  }

  // If no future workout found, find the most recent past incomplete workout
  if (closestId === null) {
    let mostRecentDiff = -Infinity
    for (const workout of workouts) {
      const date = parseDate(workout.date)
      if (!date) continue

      date.setHours(0, 0, 0, 0)
      const diff = date.getTime() - today.getTime()

      // Check if workout is incomplete
      const uniqueExercises = getUniqueExercises(workout.exercises)
      const isComplete = uniqueExercises.every((name) =>
        isExerciseComplete(name, workout.exercises)
      )

      if (!isComplete && diff > mostRecentDiff) {
        mostRecentDiff = diff
        closestId = workout.id
      }
    }
  }

  return closestId
}

// Format date for display (dd.mm.yyyy)
function formatDate(dateStr: string | null, showRelative = true): string {
  const date = parseDate(dateStr)
  if (!date) return ""

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateOnly = new Date(date)
  dateOnly.setHours(0, 0, 0, 0)

  const diff = Math.round((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (showRelative) {
    if (diff === 0) return "Today"
    if (diff === 1) return "Tomorrow"
    if (diff === -1) return "Yesterday"
  }

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

// Sort workouts by date
function sortWorkoutsByDate(workouts: Workout[]): Workout[] {
  return [...workouts].sort((a, b) => {
    const dateA = parseDate(a.date)
    const dateB = parseDate(b.date)

    // Workouts without dates go to the end
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1

    return dateA.getTime() - dateB.getTime()
  })
}

interface NewSessionExercise {
  exercise: string
  sets: string
  targetReps: string
  targetRir: string
}

export function WorkoutGrid({ spreadsheetId }: { spreadsheetId: string }) {
  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [showAddSession, setShowAddSession] = useState(false)
  const [addingSession, setAddingSession] = useState(false)
  const [newSession, setNewSession] = useState(() => ({
    name: "",
    date: new Date().toISOString().split("T")[0],
    exercises: [{ exercise: "", sets: "3", targetReps: "", targetRir: "" }] as NewSessionExercise[],
  }))

  useEffect(() => {
    async function fetchSheet() {
      try {
        const res = await fetch(`/api/sheets/${spreadsheetId}`)
        if (!res.ok) {
          throw new Error("Failed to fetch sheet")
        }
        const sheetData = await res.json()
        setData(sheetData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchSheet()
  }, [spreadsheetId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-zinc-600 dark:text-zinc-400 text-lg">
          No data found.
        </p>
      </div>
    )
  }

  // Sort workouts by date
  const sortedWorkouts = sortWorkoutsByDate(data.workouts)

  // Get all unique exercise names across all workouts (for combobox suggestions)
  const allExerciseNames = Array.from(
    new Set(sortedWorkouts.flatMap((w) => w.exercises.map((e) => e.exercise)))
  ).filter(Boolean).sort()

  // Calculate total unique exercises across all workouts
  const totalUniqueExercises = sortedWorkouts.reduce((sum, w) => {
    return sum + getUniqueExercises(w.exercises).length
  }, 0)

  // Find the closest workout to today
  const closestWorkoutId = findClosestWorkout(sortedWorkouts)

  // Update workout data after save
  const handleWorkoutUpdate = (workoutId: number, updatedExercises: SetData[]) => {
    if (!data) return
    setData({
      ...data,
      workouts: data.workouts.map((w) =>
        w.id === workoutId ? { ...w, exercises: updatedExercises } : w
      ),
    })
    // Also update the selected workout
    setSelectedWorkout((prev) =>
      prev && prev.id === workoutId ? { ...prev, exercises: updatedExercises } : prev
    )
  }

  // Add new workout
  const handleAddSession = async () => {
    const validExercises = newSession.exercises.filter((e) => e.exercise.trim())
    if (!newSession.name.trim() || validExercises.length === 0) return

    setAddingSession(true)
    try {
      const res = await fetch(`/api/sheets/${spreadsheetId}/add-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: newSession.name,
          date: newSession.date,
          exercises: validExercises,
        }),
      })

      if (!res.ok) throw new Error("Failed to add workout")

      // Refresh data
      const refreshRes = await fetch(`/api/sheets/${spreadsheetId}`)
      if (refreshRes.ok) {
        const sheetData = await refreshRes.json()
        setData(sheetData)
      }

      // Reset form
      setNewSession({
        name: "",
        date: new Date().toISOString().split("T")[0],
        exercises: [{ exercise: "", sets: "3", targetReps: "", targetRir: "" }],
      })
      setShowAddSession(false)
    } catch (err) {
      console.error("Add workout error:", err)
      alert("Failed to add workout")
    } finally {
      setAddingSession(false)
    }
  }

  const addExerciseToNewSession = () => {
    setNewSession((prev) => ({
      ...prev,
      exercises: [...prev.exercises, { exercise: "", sets: "3", targetReps: "", targetRir: "" }],
    }))
  }

  const updateNewSessionExercise = (index: number, field: keyof NewSessionExercise, value: string) => {
    setNewSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }))
  }

  const removeExerciseFromNewSession = (index: number) => {
    setNewSession((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }))
  }

  // Delete an entire session/workout
  const handleDeleteSession = async (workout: Workout, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    if (!confirm(`Delete workout #${workout.id} (Session ${workout.session})? This cannot be undone.`)) {
      return
    }

    try {
      const rowIndices = workout.exercises.map((ex) => ex.rowIndex)

      const res = await fetch(`/api/sheets/${spreadsheetId}/delete-rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndices }),
      })

      if (!res.ok) throw new Error("Failed to delete session")

      // Refresh data
      const refreshRes = await fetch(`/api/sheets/${spreadsheetId}`)
      if (refreshRes.ok) {
        const sheetData = await refreshRes.json()
        setData(sheetData)
      }
    } catch (err) {
      console.error("Delete session error:", err)
      alert("Failed to delete session")
    }
  }

  // Move a workout up or down in the program
  const handleMoveWorkout = async (workout: Workout, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    const workoutIndex = sortedWorkouts.findIndex((w) => w.id === workout.id)
    if (workoutIndex === -1) return

    // Can't move first workout up or last workout down
    if (direction === "up" && workoutIndex === 0) return
    if (direction === "down" && workoutIndex === sortedWorkouts.length - 1) return

    const targetIndex = direction === "up" ? workoutIndex - 1 : workoutIndex + 1
    const targetWorkout = sortedWorkouts[targetIndex]

    // Get row range for current workout (1-based)
    const sourceStartRow = workout.startRow
    const sourceEndRow = workout.endRow

    // Calculate destination row
    let destinationRow: number
    if (direction === "up") {
      // Move to before the target workout
      destinationRow = targetWorkout.startRow
    } else {
      // Move to after the target workout
      destinationRow = targetWorkout.endRow + 1
    }

    try {
      const res = await fetch(`/api/sheets/${spreadsheetId}/move-rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceStartRow,
          sourceEndRow,
          destinationRow,
        }),
      })

      if (!res.ok) throw new Error("Failed to move workout")

      // Refresh data from server
      const refreshRes = await fetch(`/api/sheets/${spreadsheetId}`)
      if (refreshRes.ok) {
        const sheetData = await refreshRes.json()
        setData(sheetData)
      }
    } catch (err) {
      console.error("Move workout error:", err)
      alert("Failed to move workout")
    }
  }

  // Duplicate a workout
  const handleDuplicateWorkout = async (workout: Workout, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    try {
      const res = await fetch(`/api/sheets/${spreadsheetId}/duplicate-workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startRow: workout.startRow,
          endRow: workout.endRow,
        }),
      })

      if (!res.ok) throw new Error("Failed to duplicate workout")

      // Refresh data from server
      const refreshRes = await fetch(`/api/sheets/${spreadsheetId}`)
      if (refreshRes.ok) {
        const sheetData = await refreshRes.json()
        setData(sheetData)
      }
    } catch (err) {
      console.error("Duplicate workout error:", err)
      alert("Failed to duplicate workout")
    }
  }

  // If a workout is selected, show the detail view
  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        allWorkouts={sortedWorkouts}
        allExerciseNames={allExerciseNames}
        spreadsheetId={spreadsheetId}
        onBack={() => setSelectedWorkout(null)}
        onUpdate={handleWorkoutUpdate}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.spreadsheetTitle}
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
            {sortedWorkouts.length} workouts • {totalUniqueExercises} exercises • {data.totalRows} sets
          </p>
        </div>
        <button
          onClick={() => setShowAddSession(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add workout
        </button>
      </div>

      {/* Empty state */}
      {sortedWorkouts.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-2">
            No workouts yet
          </p>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm mb-6">
            Add your first workout session to get started
          </p>
          <button
            onClick={() => setShowAddSession(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add First Workout
          </button>
        </div>
      ) : (
      /* Compact table view */
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">#</th>
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">Session</th>
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">Date</th>
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">Progress</th>
              <th className="px-3 py-2.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 w-10"></th>
              <th className="px-1 py-2.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 w-16">Order</th>
              <th className="px-1 py-2.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 w-10"></th>
              <th className="px-1 py-2.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedWorkouts.map((workout) => {
              const uniqueExercises = getUniqueExercises(workout.exercises)
              const completedExercises = uniqueExercises.filter((name) =>
                isExerciseComplete(name, workout.exercises)
              ).length
              const totalExercises = uniqueExercises.length
              const isComplete = completedExercises === totalExercises && totalExercises > 0
              const isClosest = workout.id === closestWorkoutId
              const dateDisplay = formatDate(workout.date)
              const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0

              return (
                <tr
                  key={workout.id}
                  onClick={() => setSelectedWorkout(workout)}
                  className={`cursor-pointer transition-colors ${
                    isClosest && !isComplete
                      ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      : isComplete
                      ? "bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20"
                      : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{workout.id}</span>
                      {isClosest && !isComplete && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                          Next
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                    {workout.session}
                  </td>
                  <td className={`px-3 py-2.5 ${
                    dateDisplay === "Today"
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}>
                    {dateDisplay || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isComplete
                              ? "bg-green-500"
                              : completedExercises > 0
                              ? "bg-yellow-500"
                              : "bg-zinc-300 dark:bg-zinc-600"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {completedExercises}/{totalExercises}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {isComplete ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <svg className="w-4 h-4 text-zinc-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={(e) => handleMoveWorkout(workout, "up", e)}
                        disabled={sortedWorkouts.findIndex((w) => w.id === workout.id) === 0}
                        className="p-1 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleMoveWorkout(workout, "down", e)}
                        disabled={sortedWorkouts.findIndex((w) => w.id === workout.id) === sortedWorkouts.length - 1}
                        className="p-1 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    <button
                      onClick={(e) => handleDuplicateWorkout(workout, e)}
                      className="p-1.5 text-zinc-400 hover:text-green-500 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Duplicate workout"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    <button
                      onClick={(e) => handleDeleteSession(workout, e)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Delete session"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Add workout Modal */}
      {showAddSession && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            {/* Sticky header with title, workout name and date */}
            <div className="flex-shrink-0 p-6 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Add New Workout
                </h3>
                <button
                  onClick={() => setShowAddSession(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Workout Name
                  </label>
                  <input
                    type="text"
                    value={newSession.name}
                    onChange={(e) => setNewSession((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., A or Upper"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable exercises list */}
            <div className="flex-1 overflow-y-auto p-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Exercises
                </label>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                  {newSession.exercises.map((ex, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-zinc-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Exercise {idx + 1}
                        </span>
                        {newSession.exercises.length > 1 && (
                          <button
                            onClick={() => removeExerciseFromNewSession(idx)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <ExerciseCombobox
                          value={ex.exercise}
                          onChange={(value) => updateNewSessionExercise(idx, "exercise", value)}
                          exercises={allExerciseNames}
                          placeholder="Exercise name"
                          className="!px-3 !py-2.5 !rounded-lg text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={ex.sets}
                            onChange={(e) => updateNewSessionExercise(idx, "sets", e.target.value)}
                            className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none text-sm text-center"
                            placeholder="Sets"
                            min="1"
                          />
                          <input
                            type="text"
                            value={ex.targetReps}
                            onChange={(e) => updateNewSessionExercise(idx, "targetReps", e.target.value)}
                            className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none text-sm text-center"
                            placeholder="Reps"
                          />
                          <input
                            type="text"
                            value={ex.targetRir}
                            onChange={(e) => updateNewSessionExercise(idx, "targetRir", e.target.value)}
                            className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none text-sm text-center"
                            placeholder="RIR"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addExerciseToNewSession}
                  className="mt-3 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Exercise
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setShowAddSession(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSession}
                disabled={addingSession || !newSession.name.trim() || !newSession.exercises.some((e) => e.exercise.trim())}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingSession ? "Adding..." : "Add workout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Find previous performance for an exercise (from the most recent previous workout with that exercise)
function findExercisePreviousPerformance(
  exerciseName: string,
  currentWorkoutId: number,
  allWorkouts: Workout[]
): { sets: { weight: string; reps: string; rir: string }[] } | null {
  // Find workouts before the current one that have this exercise
  for (let i = allWorkouts.length - 1; i >= 0; i--) {
    const w = allWorkouts[i]
    if (w.id >= currentWorkoutId) continue // Skip current and future workouts

    // Find sets for this exercise in this workout
    const exerciseSets = w.exercises.filter((s) => s.exercise === exerciseName)
    if (exerciseSets.length > 0) {
      const setsWithData = exerciseSets
        .filter((s) => s.weight || s.repsAchieved)
        .map((s) => ({ weight: s.weight, reps: s.repsAchieved, rir: s.targetRir }))

      if (setsWithData.length > 0) {
        return { sets: setsWithData }
      }
    }
  }
  return null
}

function WorkoutDetail({
  workout,
  allWorkouts,
  allExerciseNames,
  spreadsheetId,
  onBack,
  onUpdate,
}: {
  workout: Workout
  allWorkouts: Workout[]
  allExerciseNames: string[]
  spreadsheetId: string
  onBack: () => void
  onUpdate: (workoutId: number, updatedExercises: SetData[]) => void
}) {
  const [sets, setSets] = useState(workout.exercises)
  const [originalSets, setOriginalSets] = useState(workout.exercises)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAddSet, setShowAddSet] = useState(false)
  const [addingSet, setAddingSet] = useState(false)
  const [newSet, setNewSet] = useState({ exercise: "", targetReps: "", targetRir: "" })

  const handleUpdate = (
    rowIndex: number,
    field: "repsAchieved" | "weight" | "notes",
    value: string
  ) => {
    setSaved(false)
    setSets((prev) =>
      prev.map((s) => (s.rowIndex === rowIndex ? { ...s, [field]: value } : s))
    )
  }

  // Check if there are unsaved changes
  const hasChanges = sets.some((set, idx) => {
    const original = originalSets[idx]
    return (
      set.weight !== original.weight ||
      set.repsAchieved !== original.repsAchieved ||
      set.notes !== original.notes
    )
  })

  // Get modified sets
  const getModifiedSets = () => {
    return sets.filter((set, idx) => {
      const original = originalSets[idx]
      return (
        set.weight !== original.weight ||
        set.repsAchieved !== original.repsAchieved ||
        set.notes !== original.notes
      )
    })
  }

  const handleSaveAll = async () => {
    const modifiedSets = getModifiedSets()
    if (modifiedSets.length === 0) return

    setSaving(true)
    setSaved(false)

    try {
      // Save all modified sets in parallel
      const results = await Promise.all(
        modifiedSets.map((set) =>
          fetch(`/api/sheets/${spreadsheetId}/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rowIndex: set.rowIndex,
              weight: set.weight,
              repsAchieved: set.repsAchieved,
              notes: set.notes,
            }),
          })
        )
      )

      const allSuccessful = results.every((res) => res.ok)
      if (!allSuccessful) {
        throw new Error("Some updates failed")
      }

      // Update parent state with new values
      onUpdate(workout.id, sets)
      // Update original sets so hasChanges resets
      setOriginalSets(sets)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("Save error:", err)
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleAddSet = async () => {
    if (!newSet.exercise.trim()) return

    setAddingSet(true)
    try {
      const res = await fetch(`/api/sheets/${spreadsheetId}/add-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afterRowIndex: workout.endRow,
          sessionName: workout.session,
          exercise: newSet.exercise,
          targetReps: newSet.targetReps,
          targetRir: newSet.targetRir,
        }),
      })

      if (!res.ok) throw new Error("Failed to add set")

      const data = await res.json()

      // Add the new set to local state
      const newSetData: SetData = {
        rowIndex: data.newRowIndex,
        session: workout.session,
        exercise: newSet.exercise,
        targetReps: newSet.targetReps,
        targetRir: newSet.targetRir,
        weight: "",
        repsAchieved: "",
        notes: "",
      }

      setSets((prev) => [...prev, newSetData])
      setOriginalSets((prev) => [...prev, newSetData])
      onUpdate(workout.id, [...sets, newSetData])

      // Reset form
      setNewSet({ exercise: "", targetReps: "", targetRir: "" })
      setShowAddSet(false)
    } catch (err) {
      console.error("Add set error:", err)
      alert("Failed to add set")
    } finally {
      setAddingSet(false)
    }
  }

  // Delete all sets of an exercise
  const handleDeleteExercise = async (exerciseName: string) => {
    if (!confirm(`Delete all sets of "${exerciseName}"? This cannot be undone.`)) {
      return
    }

    try {
      const exerciseSets = sets.filter((s) => s.exercise === exerciseName)
      const rowIndices = exerciseSets.map((s) => s.rowIndex)

      const res = await fetch(`/api/sheets/${spreadsheetId}/delete-rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndices }),
      })

      if (!res.ok) throw new Error("Failed to delete exercise")

      // Update local state
      const remainingSets = sets.filter((s) => s.exercise !== exerciseName)
      setSets(remainingSets)
      setOriginalSets(remainingSets)
      onUpdate(workout.id, remainingSets)
    } catch (err) {
      console.error("Delete exercise error:", err)
      alert("Failed to delete exercise")
    }
  }

  // Delete a single set
  const handleDeleteSet = async (rowIndex: number) => {
    if (!confirm("Delete this set? This cannot be undone.")) {
      return
    }

    try {
      const res = await fetch(`/api/sheets/${spreadsheetId}/delete-rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndices: [rowIndex] }),
      })

      if (!res.ok) throw new Error("Failed to delete set")

      // Update local state
      const remainingSets = sets.filter((s) => s.rowIndex !== rowIndex)
      setSets(remainingSets)
      setOriginalSets(remainingSets)
      onUpdate(workout.id, remainingSets)
    } catch (err) {
      console.error("Delete set error:", err)
      alert("Failed to delete set")
    }
  }

  // Group sets by exercise name (preserving order)
  const exerciseGroups: { name: string; sets: SetData[] }[] = []
  const seen = new Set<string>()

  for (const set of sets) {
    if (!seen.has(set.exercise)) {
      seen.add(set.exercise)
      exerciseGroups.push({
        name: set.exercise,
        sets: sets.filter((s) => s.exercise === set.exercise),
      })
    }
  }

  const uniqueExercises = getUniqueExercises(sets)
  const completedExercises = uniqueExercises.filter((name) =>
    isExerciseComplete(name, sets)
  ).length

  const dateDisplay = formatDate(workout.date)

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onBack}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 h-full bg-zinc-50 dark:bg-zinc-950 rounded-t-2xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex-shrink-0 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-4 pb-3">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Workout #{workout.id}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  Session {workout.session}
                </span>
                {dateDisplay && (
                  <span className={`text-base ${
                    dateDisplay === "Today"
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}>
                    • {dateDisplay}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {completedExercises}/{uniqueExercises.length} exercises complete • {sets.length} sets
              </p>
            </div>
            <button
              onClick={onBack}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {/* Exercise cards */}
          <div className="space-y-4">
        {exerciseGroups.map((group) => {
          const isComplete = group.sets.every((s) => s.weight && s.repsAchieved)
          const previous = findExercisePreviousPerformance(
            group.name,
            workout.id,
            allWorkouts
          )

          return (
            <div
              key={group.name}
              className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden ${
                isComplete
                  ? "border-green-300 dark:border-green-800"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {/* Exercise header */}
              <div
                className={`px-4 py-3 ${
                  isComplete
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-zinc-50 dark:bg-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-base ${
                    isComplete
                      ? "text-green-800 dark:text-green-200"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}>{group.name}</span>
                  <div className="flex items-center gap-2">
                    {isComplete && <span className="text-green-800 dark:text-green-200">✓</span>}
                    <button
                      onClick={() => handleDeleteExercise(group.name)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-zinc-900/50"
                      title="Delete exercise"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Previous performance at exercise level */}
                {previous && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Last
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {previous.sets.map((s, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-medium"
                        >
                          <span className="font-semibold">{s.weight}</span>
                          <span className="text-purple-400 dark:text-purple-500 text-xs">kg</span>
                          <span className="text-purple-400 dark:text-purple-500">×</span>
                          <span className="font-semibold">{s.reps}</span>
                          <span className="text-purple-400 dark:text-purple-500 text-xs">reps</span>
                          {s.rir && (
                            <>
                              <span className="text-purple-300 dark:text-purple-600">|</span>
                              <span className="text-purple-500 dark:text-purple-400 text-xs">RIR</span>
                              <span className="font-semibold">{s.rir}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sets */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {group.sets.map((set, idx) => (
                    <div key={set.rowIndex} className="p-4">
                      {/* Set header row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            Set {idx + 1}
                          </span>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            • {set.targetReps} reps @ RIR {set.targetRir}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSet(set.rowIndex)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Delete set"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Input row */}
                      <div className="grid grid-cols-2 gap-4">
                        <FloatingInput
                          type="number"
                          inputMode="decimal"
                          label="Weight (kg)"
                          value={set.weight}
                          onChange={(e) =>
                            handleUpdate(set.rowIndex, "weight", e.target.value)
                          }
                        />
                        <FloatingInput
                          type="number"
                          inputMode="numeric"
                          label="Reps"
                          value={set.repsAchieved}
                          onChange={(e) =>
                            handleUpdate(set.rowIndex, "repsAchieved", e.target.value)
                          }
                        />
                      </div>

                      {/* Notes */}
                      <div className="mt-4">
                        <input
                          type="text"
                          value={set.notes}
                          onChange={(e) =>
                            handleUpdate(set.rowIndex, "notes", e.target.value)
                          }
                          className="w-full px-4 py-3 text-base border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100"
                          placeholder="Notes (optional)"
                        />
                      </div>
                    </div>
                  ))}

                {/* Quick Add Set for this exercise */}
                <button
                  onClick={() => {
                    setNewSet({ exercise: group.name, targetReps: "", targetRir: "" })
                    setShowAddSet(true)
                  }}
                  className="w-full py-2.5 text-sm text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Set
                </button>
              </div>
            </div>
          )
        })}

        {/* Add Exercise Button */}
        <button
          onClick={() => {
            setNewSet({ exercise: "", targetReps: "", targetRir: "" })
            setShowAddSet(true)
          }}
          className="w-full mt-4 py-3 px-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Exercise
        </button>
          </div>
        </div>

        {/* Save button - inside drawer */}
        <div className="flex-shrink-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-colors ${
              saved
                ? "bg-green-600 text-white"
                : hasChanges
                ? "bg-blue-600 text-white active:bg-blue-700"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
            } disabled:opacity-50`}
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : hasChanges ? "Save Changes" : "No Changes"}
          </button>
        </div>
      </div>

      {/* Add Set Modal */}
      {showAddSet && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {newSet.exercise ? `Add Set to ${newSet.exercise}` : "Add New Exercise"}
              </h3>
              <button
                onClick={() => setShowAddSet(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Exercise Name
              </label>
              <ExerciseCombobox
                value={newSet.exercise}
                onChange={(value) => setNewSet((prev) => ({ ...prev, exercise: value }))}
                exercises={allExerciseNames}
                placeholder="e.g., Bench Press"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Target Reps
                </label>
                <input
                  type="text"
                  value={newSet.targetReps}
                  onChange={(e) => setNewSet((prev) => ({ ...prev, targetReps: e.target.value }))}
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  placeholder="8-12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Target RIR
                </label>
                <input
                  type="text"
                  value={newSet.targetRir}
                  onChange={(e) => setNewSet((prev) => ({ ...prev, targetRir: e.target.value }))}
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  placeholder="2"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddSet(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSet}
                disabled={addingSet || !newSet.exercise.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingSet ? "Adding..." : "Add Set"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
