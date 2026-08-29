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
 * Format today's date and time as DD/MM/YYYY, HH:MM
 */
export const formatTodayDDMMYYYY = (): string => {
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  const time = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
  return `${date}, ${time}`;
};
