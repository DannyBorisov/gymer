/**
 * Parse DD/MM/YYYY or DD/MM/YYYY, HH:MM string to Date
 */
export function parseDate(str: string): Date | null {
  if (!str || typeof str !== "string") return null;

  const trimmed = str.trim();

  // Match DD/MM/YYYY or DD/MM/YYYY, HH:MM
  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s*(\d{2}):(\d{2}))?$/,
  );
  if (!match) return null;

  const [, day, month, year, hours, minutes] = match;
  const date = new Date(
    +year,
    +month - 1,
    +day,
    hours ? +hours : 0,
    minutes ? +minutes : 0,
  );

  // Validate the date is real
  if (isNaN(date.getTime())) return null;

  return date;
}

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
}

/**
 * Extract wall-clock parts from a Date or a string. A timezone-less ISO string
 * (`YYYY-MM-DDTHH:MM[:SS]`) is read literally so the client's local time is
 * preserved regardless of the server's timezone (which is UTC).
 */
function toWallClock(value: Date | string): WallClock {
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      return {
        year: +m[1],
        month: +m[2],
        day: +m[3],
        hours: +m[4],
        minutes: +m[5],
      };
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}

/**
 * Coerce a Date or an ISO/date string (JSON serializes Date to string over the wire)
 * into a valid Date. Throws on an unparseable value.
 */
export function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return date;
}

/**
 * Format Date to DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const w = toWallClock(date);
  const day = String(w.day).padStart(2, "0");
  const month = String(w.month).padStart(2, "0");
  return `${day}/${month}/${w.year}`;
}

/**
 * Format Date to DD/MM/YYYY, HH:MM
 */
export function formatDateTime(date: Date | string): string {
  const w = toWallClock(date);
  const dateStr = formatDate(date);
  const hours = String(w.hours).padStart(2, "0");
  const minutes = String(w.minutes).padStart(2, "0");
  return `${dateStr}, ${hours}:${minutes}`;
}

/**
 * Check if string is duration format (H:MM:SS or HH:MM:SS)
 */
export function isDuration(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  return /^\d{1,2}:\d{2}:\d{2}$/.test(str.trim());
}

/**
 * Check if string is a date format (DD/MM/YYYY)
 */
export function isDateFormat(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  return /^\d{1,2}\/\d{1,2}\/\d{4}(,?\s*\d{2}:\d{2})?$/.test(str.trim());
}
