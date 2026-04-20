import { describe, expect, it } from 'vitest'
import { normalizeKpiDisplayValue, normalizeKpiNumericValue } from '../saplingKpiValue'

describe('normalizeKpiDisplayValue', () => {
  it('returns finite numbers unchanged', () => {
    expect(normalizeKpiDisplayValue(42)).toBe(42)
  })

  it('converts numeric strings to numbers', () => {
    expect(normalizeKpiDisplayValue('  12.5  ')).toBe(12.5)
  })

  it('unwraps nested value objects', () => {
    expect(normalizeKpiDisplayValue({ value: { value: '7' } })).toBe(7)
  })

  it('falls back to zero for unsupported values', () => {
    expect(normalizeKpiDisplayValue(null)).toBe(0)
    expect(normalizeKpiDisplayValue('')).toBe(0)
  })
})

describe('normalizeKpiNumericValue', () => {
  it('uses the numeric fallback for non-numeric strings', () => {
    expect(normalizeKpiNumericValue('not-a-number', 99)).toBe(99)
  })

  it('maps booleans to chart-safe numbers', () => {
    expect(normalizeKpiNumericValue(true)).toBe(1)
    expect(normalizeKpiNumericValue(false)).toBe(0)
  })
})
