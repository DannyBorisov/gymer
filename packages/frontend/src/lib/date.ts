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
 * Format DD/MM/YYYY date string to include day name (e.g., "Mon, 25/12/2024")
 */
export const formatDateWithDay = (dateStr: string): string => {
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${dayName}, ${dateStr}`;
};

/**
 * Format today's date as DD/MM/YYYY
 */
export const formatTodayDDMMYYYY = (): string => {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
};
