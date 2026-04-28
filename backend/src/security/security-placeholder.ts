export const SECURITY_PLACEHOLDER = 'sapling';

export function getSecurityFieldDisplayValue(value: unknown): string {
  return hasSecurityFieldContent(value) ? SECURITY_PLACEHOLDER : '';
}

export function shouldClearSecurityFieldInput(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' || trimmedValue === SECURITY_PLACEHOLDER;
}

function hasSecurityFieldContent(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasSecurityFieldContent(entry));
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasSecurityFieldContent(entry),
    );
  }

  return true;
}
