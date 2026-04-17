type NumericLike = number | string | null | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Converts backend KPI scalar values into a display-safe primitive.
 */
export function normalizeKpiDisplayValue(value: unknown): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
      return 0
    }

    const numericValue = Number(trimmedValue)
    return Number.isFinite(numericValue) ? numericValue : trimmedValue
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (isRecord(value) && 'value' in value) {
    return normalizeKpiDisplayValue(value.value)
  }

  return 0
}

/**
 * Converts backend KPI values into numeric chart points.
 */
export function normalizeKpiNumericValue(value: unknown, fallback = 0): number {
  const normalizedValue = normalizeKpiDisplayValue(value as NumericLike)

  if (typeof normalizedValue === 'number' && Number.isFinite(normalizedValue)) {
    return normalizedValue
  }

  if (typeof normalizedValue === 'string') {
    const numericValue = Number(normalizedValue)
    return Number.isFinite(numericValue) ? numericValue : fallback
  }

  return fallback
}
