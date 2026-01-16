/**
 * Central date utility functions for consistent date handling across the app.
 *
 * The backend stores dates as Unix timestamps (milliseconds since epoch).
 * The frontend TypeScript types expect JavaScript Date objects.
 * This utility ensures consistent conversion regardless of input format.
 */

/**
 * Converts any date-like value to a JavaScript Date object.
 * Handles: Unix timestamps (numbers), ISO strings, Date objects, null/undefined
 *
 * @param value - Any date-like value
 * @returns Date object or null if invalid
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Unix timestamp (number)
  if (typeof value === 'number') {
    // Handle both milliseconds and seconds
    // If the number is less than 10 billion, it's probably seconds (before year 2286)
    const timestamp = value < 10000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  // String (ISO format or other parseable string)
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Converts a date-like value to a Date object, with fallback to current date.
 * Use this when you need a Date and cannot have null.
 *
 * @param value - Any date-like value
 * @param fallback - Fallback date (defaults to current date)
 * @returns Date object (never null)
 */
export function toDateOrNow(value: unknown, fallback?: Date): Date {
  const date = toDate(value);
  return date ?? fallback ?? new Date();
}

/**
 * Converts a Date to Unix timestamp (milliseconds) for API transmission.
 *
 * @param date - Date object or any date-like value
 * @returns Unix timestamp in milliseconds, or null
 */
export function toTimestamp(date: unknown): number | null {
  const d = toDate(date);
  return d ? d.getTime() : null;
}

/**
 * Converts a Date to Unix timestamp, with fallback to current time.
 *
 * @param date - Date object or any date-like value
 * @returns Unix timestamp in milliseconds (never null)
 */
export function toTimestampOrNow(date: unknown): number {
  return toTimestamp(date) ?? Date.now();
}

/**
 * Formats a date-like value for German locale display.
 *
 * @param value - Any date-like value
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted string or '-' if invalid
 */
export function formatDate(
  value: unknown,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
): string {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('de-DE', options);
}

/**
 * Formats a date-like value with time for German locale display.
 *
 * @param value - Any date-like value
 * @returns Formatted string with date and time, or '-' if invalid
 */
export function formatDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats a date for chart display (short format).
 *
 * @param value - Any date-like value
 * @returns Short formatted string (e.g., "17.01.")
 */
export function formatDateShort(value: unknown): string {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit' });
}

/**
 * Gets timestamp for sorting purposes.
 * Returns 0 for invalid dates to ensure consistent sorting.
 *
 * @param value - Any date-like value
 * @returns Timestamp for sorting (0 if invalid)
 */
export function getTimestampForSort(value: unknown): number {
  return toTimestamp(value) ?? 0;
}
