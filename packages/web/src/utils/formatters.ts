/**
 * Formatting utilities for the Release Web Application
 */

/**
 * Formats an ISO 8601 date string to a display format
 * @param isoDate - ISO 8601 date string
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 */
export function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Formats a percentage value with 2 decimal places
 * @param value - The percentage value to format
 * @returns Formatted percentage string (e.g., "12.34%")
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Formats a number for DAU counts with thousand separators
 * @param count - The count to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function formatDAUCount(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}
