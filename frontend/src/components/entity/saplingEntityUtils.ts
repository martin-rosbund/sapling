
/**
 * Utility functions for formatting values in tables.
 */

/**
 * Formats a value based on its type (e.g., date, datetime, etc.).
 * @param value The value to format.
 * @param type The type of the value (e.g., 'date', 'datetime').
 * @returns The formatted value as a string.
 */
export function formatValue(value: string, type?: string): string {
  switch (type?.toLocaleLowerCase()) {
    case 'datetime':
    case 'datetype':
    case 'date':
      return formatDate(value, type);
    default:
      return value;
  }
}

/**
 * Formats a date value based on its type.
 * @param value The date value (string or Date).
 * @param type The type of the value (e.g., 'datetime', 'date').
 * @returns The formatted date as a string.
 */
export function formatDate(value: string | Date, type?: string): string {
  if (!value) return '';
  const date = new Date(value);
  switch (type?.toLocaleLowerCase()) {
    case 'datetime':
      return date.toLocaleString();
    default:
      return date.toLocaleDateString();
  }
}
