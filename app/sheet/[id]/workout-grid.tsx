"use client"

import { useEffect, useState } from "react"

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

// Parse date string to Date object (handles dd.mm.yyyy and other formats)
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  // Try DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY format first
  const parts = dateStr.split(/[\/\-\.]/)
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number)
    if (day && month && year) {
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) return date
    }
  }

  // Try parsing as ISO format (yyyy-mm-dd)
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

export function WorkoutGrid({ spreadsheetId }: { spreadsheetId: string }) {
  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)

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

  if (!data || data.workouts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-zinc-600 dark:text-zinc-400 text-lg">
          No workouts found in this spreadsheet.
        </p>
      </div>
    )
  }

  // Sort workouts by date
  const sortedWorkouts = sortWorkoutsByDate(data.workouts)

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

  // If a workout is selected, show the detail view
  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        allWorkouts={sortedWorkouts}
        spreadsheetId={spreadsheetId}
        onBack={() => setSelectedWorkout(null)}
        onUpdate={handleWorkoutUpdate}
      />
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {data.spreadsheetTitle}
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
          {sortedWorkouts.length} workouts • {totalUniqueExercises} exercises • {data.totalRows} sets
        </p>
      </div>

      {/* Compact table view */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">#</th>
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">Session</th>
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">Date</th>
              <th className="px-3 py-2.5 text-left font-semibold text-zinc-600 dark:text-zinc-400">Progress</th>
              <th className="px-3 py-2.5 text-center font-semibold text-zinc-600 dark:text-zinc-400 w-12"></th>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
  spreadsheetId,
  onBack,
  onUpdate,
}: {
  workout: Workout
  allWorkouts: Workout[]
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
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-4 py-2 -ml-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-base">Back</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          {completedExercises}/{uniqueExercises.length} exercises complete • {sets.length} sets
        </p>
      </div>

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
                  {isComplete && <span className="text-green-800 dark:text-green-200">✓</span>}
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
                      </div>

                      {/* Input row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={set.weight}
                            onChange={(e) =>
                              handleUpdate(set.rowIndex, "weight", e.target.value)
                            }
                            className="w-full px-4 py-4 text-lg font-semibold text-center border-2 border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Reps
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.repsAchieved}
                            onChange={(e) =>
                              handleUpdate(set.rowIndex, "repsAchieved", e.target.value)
                            }
                            className="w-full px-4 py-4 text-lg font-semibold text-center border-2 border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                            placeholder="0"
                          />
                        </div>
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
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800">
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
  )
}
