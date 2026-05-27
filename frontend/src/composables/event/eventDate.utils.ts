export interface CalendarDateItem {
  date: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export interface EventDateParts {
  iso: string
  date: string
  time: string
}

export type CalendarType = 'workweek' | 'month' | 'day' | 'week'

export function parseLocalCalendarDate(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
  if (!match) {
    return new Date(input)
  }

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function normalizeDateForCalendarType(date: Date, calendarType: CalendarType) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)

  switch (calendarType) {
    case 'day':
      return normalized
    case 'workweek':
    case 'week': {
      const day = normalized.getDay()
      const offsetToMonday = day === 0 ? -6 : 1 - day
      normalized.setDate(normalized.getDate() + offsetToMonday)
      return normalized
    }
    case 'month':
      normalized.setDate(1)
      return normalized
    default:
      return normalized
  }
}

export function getEventDateParts(value: number | string | Date): EventDateParts {
  const date = new Date(value)
  return {
    iso: isValidDate(date) ? date.toISOString() : '',
    date: isValidDate(date) ? formatLocalDate(date) : '',
    time: isValidDate(date) ? formatLocalTime(date) : '',
  }
}

export function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime())
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLocalTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function roundTime(time: number, down = true) {
  const roundTo = 15 * 60 * 1000
  if (down) {
    return time - (time % roundTo)
  }

  return time % roundTo === 0 ? time : time + (roundTo - (time % roundTo))
}

export function toTime(timeSlot: CalendarDateItem) {
  return new Date(
    timeSlot.year,
    timeSlot.month - 1,
    timeSlot.day,
    timeSlot.hour,
    timeSlot.minute,
  ).getTime()
}

export function getWeekNumber(date: Date) {
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = normalized.getUTCDay() || 7
  normalized.setUTCDate(normalized.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1))
  return Math.ceil(((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
