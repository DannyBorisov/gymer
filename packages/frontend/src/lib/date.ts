/**
 * Format ISO date string to localized date (e.g., "Dec 25, 2024")
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
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
