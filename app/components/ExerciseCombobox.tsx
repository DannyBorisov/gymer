"use client"

import Autocomplete from "@mui/material/Autocomplete"
import TextField from "@mui/material/TextField"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { useMemo, useState, useEffect } from "react"

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
}: ExerciseComboboxProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check initial dark mode preference
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDarkMode(darkModeQuery.matches)

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    darkModeQuery.addEventListener("change", handler)
    return () => darkModeQuery.removeEventListener("change", handler)
  }, [])

  // Create a theme that respects system dark mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
        },
        components: {
          MuiAutocomplete: {
            styleOverrides: {
              paper: {
                borderRadius: "12px",
                marginTop: "4px",
              },
              listbox: {
                padding: "4px",
              },
              option: {
                borderRadius: "8px",
                margin: "2px 4px",
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                },
              },
            },
          },
        },
      }),
    [isDarkMode]
  )

  // Remove duplicates and sort alphabetically
  const uniqueExercises = useMemo(() => {
    const unique = [...new Set(exercises.filter(Boolean))]
    return unique.sort((a, b) => a.localeCompare(b))
  }, [exercises])

  return (
    <ThemeProvider theme={theme}>
      <Autocomplete
        freeSolo
        value={value}
        onChange={(_, newValue) => {
          onChange(newValue || "")
        }}
        onInputChange={(_, newInputValue) => {
          onChange(newInputValue)
        }}
        options={uniqueExercises}
        filterOptions={(options, { inputValue }) => {
          const filtered = options.filter((option) =>
            option.toLowerCase().includes(inputValue.toLowerCase())
          )
          return filtered
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            autoFocus={autoFocus}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                padding: "4px 8px",
              },
            }}
          />
        )}
        size="small"
        fullWidth
        autoHighlight
        selectOnFocus
        clearOnBlur={false}
        handleHomeEndKeys
      />
    </ThemeProvider>
  )
}
