"use client"

import { useEffect, useState, useRef } from "react"

interface ExerciseComboboxProps {
  value: string
  onChange: (value: string) => void
  exercises: string[]
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function ExerciseCombobox({
  value,
  onChange,
  exercises,
  placeholder = "Exercise name",
  autoFocus = false,
  className = "",
}: ExerciseComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredExercises, setFilteredExercises] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const filtered = exercises.filter(
        (ex) => ex.toLowerCase().includes(value.toLowerCase()) && ex.toLowerCase() !== value.toLowerCase()
      )
      setFilteredExercises(filtered)
    } else {
      setFilteredExercises(exercises)
    }
  }, [value, exercises])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className={`w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none ${className}`}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {isOpen && filteredExercises.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredExercises.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                onChange(ex)
                setIsOpen(false)
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 first:rounded-t-xl last:rounded-b-xl"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
