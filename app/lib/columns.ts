/**
 * Column Mapping Utility
 *
 * This is the single source of truth for column structure.
 * All read and write operations should use these constants and helpers
 * to ensure consistent column alignment regardless of empty cells.
 */

// Canonical column indices - this defines the expected column order
export const COLUMNS = {
  DATE: 0,
  SESSION: 1,
  EXERCISE: 2,
  TARGET_REPS: 3,
  TARGET_RIR: 4,
  WEIGHT: 5,
  REPS_ACHIEVED: 6,
  NOTES: 7,
} as const

export const COLUMN_COUNT = 8

// Expected header names (used when creating new sheets)
export const HEADERS = [
  "Date",
  "Session",
  "Exercise",
  "Target Reps",
  "Target RIR",
  "Weight",
  "Reps Achieved",
  "Notes",
]

/**
 * Normalize a row to always have COLUMN_COUNT elements.
 * Google Sheets API trims trailing empty cells, which can cause
 * misalignment when accessing by index. This ensures consistent length.
 */
export function normalizeRow(row: (string | undefined | null)[]): string[] {
  const normalized: string[] = []
  for (let i = 0; i < COLUMN_COUNT; i++) {
    normalized.push(row[i] ?? "")
  }
  return normalized
}

/**
 * Normalize all rows in a dataset
 */
export function normalizeRows(rows: (string | undefined | null)[][]): string[][] {
  return rows.map(normalizeRow)
}

/**
 * Build a row for writing with explicit column placement.
 * This ensures data is always written to the correct columns.
 */
export function buildRow(data: {
  date?: string
  session?: string
  exercise?: string
  targetReps?: string
  targetRir?: string
  weight?: string
  repsAchieved?: string
  notes?: string
}): string[] {
  const row: string[] = new Array(COLUMN_COUNT).fill("")
  row[COLUMNS.DATE] = data.date ?? ""
  row[COLUMNS.SESSION] = data.session ?? ""
  row[COLUMNS.EXERCISE] = data.exercise ?? ""
  row[COLUMNS.TARGET_REPS] = data.targetReps ?? ""
  row[COLUMNS.TARGET_RIR] = data.targetRir ?? ""
  row[COLUMNS.WEIGHT] = data.weight ?? ""
  row[COLUMNS.REPS_ACHIEVED] = data.repsAchieved ?? ""
  row[COLUMNS.NOTES] = data.notes ?? ""
  return row
}

/**
 * Convert date from yyyy-mm-dd (HTML date input) to dd.mm.yyyy (sheet format)
 */
export function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return ""
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}.${month}.${year}`
  }
  return dateStr
}

/**
 * Extract data from a normalized row using canonical column positions.
 * Use this when reading data from sheets.
 */
export function parseRow(row: string[]): {
  date: string
  session: string
  exercise: string
  targetReps: string
  targetRir: string
  weight: string
  repsAchieved: string
  notes: string
} {
  const normalized = normalizeRow(row)
  return {
    date: normalized[COLUMNS.DATE],
    session: normalized[COLUMNS.SESSION],
    exercise: normalized[COLUMNS.EXERCISE],
    targetReps: normalized[COLUMNS.TARGET_REPS],
    targetRir: normalized[COLUMNS.TARGET_RIR],
    weight: normalized[COLUMNS.WEIGHT],
    repsAchieved: normalized[COLUMNS.REPS_ACHIEVED],
    notes: normalized[COLUMNS.NOTES],
  }
}
