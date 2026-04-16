import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatDate,
  formatDateFromTo,
  formatDateTimeValue,
  formatDateValue,
  formatTimeValue,
  formatValue,
  getDateCellState,
  getDateTimeCellState,
} from '../saplingFormatUtil'

function getExpectedDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getExpectedTime(value: Date) {
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

describe('saplingFormatUtil', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatting helpers', () => {
    it('formats local date strings as localized dates', () => {
      const input = '2026-04-15'

      expect(formatDateValue(input)).toBe(getExpectedDate(new Date(2026, 3, 15)))
    })

    it('normalizes plain time strings without seconds', () => {
      expect(formatTimeValue('09:30:59')).toBe('09:30')
    })

    it('combines split date and time values into one localized label', () => {
      expect(formatDateTimeValue(undefined, '2026-04-15', '09:30:00')).toBe(
        `${getExpectedDate(new Date(2026, 3, 15))} 09:30`,
      )
    })

    it('routes format helpers by type', () => {
      const date = new Date(2026, 3, 15, 9, 30)

      expect(formatValue('2026-04-15T09:30:00', 'datetime')).toBe(
        `${getExpectedDate(date)} ${getExpectedTime(date)}`,
      )
      expect(formatDate('09:30:59', 'time')).toBe('09:30')
    })

    it('formats date ranges on the same day with a shared date label', () => {
      const start = '2026-04-15T09:00:00'
      const end = '2026-04-15T11:30:00'

      expect(formatDateFromTo(start, end)).toBe(
        `${getExpectedDate(new Date(2026, 3, 15))} ${getExpectedTime(new Date(2026, 3, 15, 9, 0))} - ${getExpectedTime(new Date(2026, 3, 15, 11, 30))}`,
      )
    })
  })

  describe('date display states', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 3, 16, 12, 0, 0))
    })

    it('marks past, upcoming, and default dates relative to today', () => {
      expect(getDateCellState('2026-04-15')).toBe('past')
      expect(getDateCellState('2026-04-17')).toBe('upcoming')
      expect(getDateCellState('2026-04-19')).toBe('default')
    })

    it('marks split date and time values relative to the current time', () => {
      expect(getDateTimeCellState(undefined, '2026-04-16', '11:30')).toBe('past')
      expect(getDateTimeCellState(undefined, '2026-04-16', '13:00')).toBe('upcoming')
      expect(getDateTimeCellState(undefined, '2026-04-18', '08:00')).toBe('default')
    })
  })
})