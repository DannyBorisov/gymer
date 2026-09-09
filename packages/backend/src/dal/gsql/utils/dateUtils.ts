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
  const d = toDate(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format Date to DD/MM/YYYY, HH:MM
 */
export function formatDateTime(date: Date | string): string {
  const d = toDate(date);
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
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
