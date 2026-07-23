"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface Exercise {
  id: string
  name: string
  sets: number
  targetReps: string
  targetRir: string
}

interface Session {
  id: string
  name: string
  date: string
  exercises: Exercise[]
}

export function ProgramBuilder() {
  const router = useRouter()
  const [programName, setProgramName] = useState("")
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      name: "1",
      date: "",
      exercises: [
        { id: "1", name: "", sets: 3, targetReps: "8-12", targetRir: "2" },
      ],
    },
  ])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drag and drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null)
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const addSession = () => {
    const newId = String(Date.now())
    setSessions([
      ...sessions,
      {
        id: newId,
        name: String(sessions.length + 1),
        date: "",
        exercises: [
          { id: "1", name: "", sets: 3, targetReps: "8-12", targetRir: "2" },
        ],
      },
    ])
  }

  const removeSession = (sessionId: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter((s) => s.id !== sessionId))
    }
  }

  const updateSession = (
    sessionId: string,
    field: "name" | "date",
    value: string
  ) => {
    setSessions(
      sessions.map((s) => (s.id === sessionId ? { ...s, [field]: value } : s))
    )
  }

  const addExercise = (sessionId: string) => {
    setSessions(
      sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            exercises: [
              ...s.exercises,
              {
                id: String(Date.now()),
                name: "",
                sets: 3,
                targetReps: "8-12",
                targetRir: "2",
              },
            ],
          }
        }
        return s
      })
    )
  }

  const removeExercise = (sessionId: string, exerciseId: string) => {
    setSessions(
      sessions.map((s) => {
        if (s.id === sessionId && s.exercises.length > 1) {
          return {
            ...s,
            exercises: s.exercises.filter((e) => e.id !== exerciseId),
          }
        }
        return s
      })
    )
  }

  const updateExercise = (
    sessionId: string,
    exerciseId: string,
    field: keyof Exercise,
    value: string | number
  ) => {
    setSessions(
      sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            exercises: s.exercises.map((e) =>
              e.id === exerciseId ? { ...e, [field]: value } : e
            ),
          }
        }
        return s
      })
    )
  }

  const duplicateSession = (session: Session) => {
    const newId = String(Date.now())
    const newSession: Session = {
      ...session,
      id: newId,
      name: session.name,
      date: "",
      exercises: session.exercises.map((e, idx) => ({
        ...e,
        id: String(Date.now() + idx),
      })),
    }
    setSessions([...sessions, newSession])
  }

  const moveSession = (sessionId: string, direction: "up" | "down") => {
    const idx = sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return
    if (direction === "up" && idx === 0) return
    if (direction === "down" && idx === sessions.length - 1) return

    const newSessions = [...sessions]
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    ;[newSessions[idx], newSessions[targetIdx]] = [newSessions[targetIdx], newSessions[idx]]
    setSessions(newSessions)
  }

  // Drag and drop handlers (desktop only)
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSessionId(sessionId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", sessionId)

    setTimeout(() => {
      const element = document.getElementById(`session-${sessionId}`)
      if (element) {
        element.style.opacity = "0.5"
      }
    }, 0)
  }

  const handleDragEnd = () => {
    const element = document.getElementById(`session-${draggedSessionId}`)
    if (element) {
      element.style.opacity = "1"
    }
    setDraggedSessionId(null)
    setDragOverSessionId(null)
    dragCounter.current = 0
  }

  const handleDragEnter = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault()
    dragCounter.current++
    if (sessionId !== draggedSessionId) {
      setDragOverSessionId(sessionId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverSessionId(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault()
    dragCounter.current = 0

    if (!draggedSessionId || draggedSessionId === targetSessionId) {
      setDragOverSessionId(null)
      return
    }

    const draggedIndex = sessions.findIndex((s) => s.id === draggedSessionId)
    const targetIndex = sessions.findIndex((s) => s.id === targetSessionId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newSessions = [...sessions]
    const [draggedSession] = newSessions.splice(draggedIndex, 1)
    newSessions.splice(targetIndex, 0, draggedSession)

    setSessions(newSessions)
    setDragOverSessionId(null)
  }

  const handleCreate = async () => {
    if (!programName.trim()) {
      setError("Please enter a program name")
      return
    }

    const hasEmptyExercise = sessions.some((s) =>
      s.exercises.some((e) => !e.name.trim())
    )
    if (hasEmptyExercise) {
      setError("Please fill in all exercise names")
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/sheets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programName,
          sessions: sessions.map((s) => ({
            name: s.name,
            date: s.date,
            exercises: s.exercises.map((e) => ({
              name: e.name,
              sets: e.sets,
              targetReps: e.targetReps,
              targetRir: e.targetRir,
            })),
          })),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to create program")
      }

      const data = await res.json()
      router.push(`/sheet/${data.spreadsheetId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Program Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Program Name
        </label>
        <input
          type="text"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          placeholder="e.g., Push Pull Legs"
          className="w-full px-4 py-3 text-base border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Sessions Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Sessions
        </h2>
        <button
          onClick={addSession}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
        >
          + Add workout
        </button>
      </div>

      {/* Sessions */}
      <div className="space-y-4">
        {sessions.map((session, sessionIdx) => (
          <div
            key={session.id}
            id={`session-${session.id}`}
            draggable
            onDragStart={(e) => handleDragStart(e, session.id)}
            onDragEnd={handleDragEnd}
            onDragEnter={(e) => handleDragEnter(e, session.id)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, session.id)}
            className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
              dragOverSessionId === session.id
                ? "border-blue-500 border-2 scale-[1.01]"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {/* Session Header */}
            <div className="bg-zinc-50 dark:bg-zinc-800 p-4">
              <div className="flex items-center gap-3">
                {/* Reorder buttons (mobile) */}
                <div className="flex flex-col gap-1 sm:hidden">
                  <button
                    onClick={() => moveSession(session.id, "up")}
                    disabled={sessionIdx === 0}
                    className="p-1 text-zinc-400 disabled:opacity-30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveSession(session.id, "down")}
                    disabled={sessionIdx === sessions.length - 1}
                    className="p-1 text-zinc-400 disabled:opacity-30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Drag Handle (desktop) */}
                <div className="hidden sm:block text-zinc-400 dark:text-zinc-500 cursor-grab active:cursor-grabbing">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={session.name}
                      onChange={(e) => updateSession(session.id, "name", e.target.value)}
                      placeholder="Push A"
                      className="w-full px-3 py-2 text-base border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={session.date}
                      onChange={(e) => updateSession(session.id, "date", e.target.value)}
                      className="w-full px-3 py-2 text-base border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* Session actions */}
              <div className="flex gap-2 mt-3 ml-8 sm:ml-8">
                <button
                  onClick={() => duplicateSession(session)}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"
                >
                  Duplicate
                </button>
                {sessions.length > 1 && (
                  <button
                    onClick={() => removeSession(session.id)}
                    className="px-3 py-1.5 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Exercises */}
            <div className="p-4 space-y-3">
              {session.exercises.map((exercise, exerciseIdx) => (
                <div
                  key={exercise.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                >
                  {/* Exercise name */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {exerciseIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(session.id, exercise.id, "name", e.target.value)
                      }
                      placeholder="Exercise name"
                      className="flex-1 px-3 py-2.5 text-base border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                    {session.exercises.length > 1 && (
                      <button
                        onClick={() => removeExercise(session.id, exercise.id)}
                        className="p-2 text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Exercise details */}
                  <div className="grid grid-cols-3 gap-2 ml-8">
                    <div>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        Sets
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(session.id, exercise.id, "sets", parseInt(e.target.value) || 1)
                        }
                        className="w-full px-2 py-2 text-base text-center border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        Reps
                      </label>
                      <input
                        type="text"
                        value={exercise.targetReps}
                        onChange={(e) =>
                          updateExercise(session.id, exercise.id, "targetReps", e.target.value)
                        }
                        placeholder="8-12"
                        className="w-full px-2 py-2 text-base text-center border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        RIR
                      </label>
                      <input
                        type="text"
                        value={exercise.targetRir}
                        onChange={(e) =>
                          updateExercise(session.id, exercise.id, "targetRir", e.target.value)
                        }
                        placeholder="2"
                        className="w-full px-2 py-2 text-base text-center border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => addExercise(session.id)}
                className="w-full py-3 text-sm font-medium text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-800 rounded-lg"
              >
                + Add Exercise
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Sticky Create Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-base active:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Program"}
        </button>
      </div>
    </div>
  )
}
