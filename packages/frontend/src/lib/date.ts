/**
 * Parse date string that may be in DD/MM/YYYY or ISO format
 */
export const parseDate = (dateString: string): Date => {
  // Handle DD/MM/YYYY format (from Google Sheets)
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  // Fallback to standard Date parsing (ISO format)
  return new Date(dateString);
};

/**
 * Format ISO date string to localized date (e.g., "Dec 25, 2024")
 */
export const formatDate = (dateString: string): string => {
  return parseDate(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format ISO date string to include day name (e.g., "Mon, Dec 25")
 */
export const formatDateWithDay = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format today's date as ISO string (e.g., "2024-12-25T10:30:00.000Z")
 */
export const formatTodayISO = (): string => {
  return new Date().toISOString();
};
