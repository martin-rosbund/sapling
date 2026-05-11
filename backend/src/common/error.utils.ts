/**
 * Common error helpers shared across the backend.
 */

/**
 * Extracts a human readable message from an arbitrary thrown value.
 * @param error The value thrown / caught.
 * @returns The error message, or a string representation as fallback.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
