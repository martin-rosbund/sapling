import type { EventItem } from '@/entity/entity'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type RecurrenceEndMode = 'never' | 'until' | 'count'
export type RecurrenceWeekdayCode = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export interface ParsedRecurrenceRule {
  raw: string
  frequency: RecurrenceFrequency
  interval: number
  byDay: RecurrenceWeekdayCode[]
  count?: number
  until?: Date
}

export interface RecurrenceRuleInput {
  frequency: RecurrenceFrequency | 'NONE'
  interval?: number | null
  weekdays?: RecurrenceWeekdayCode[]
  endMode?: RecurrenceEndMode
  count?: number | null
  untilDate?: string | null
  untilTime?: string | null
  startDate?: string | Date | null
  startTime?: string | null
  isAllDay?: boolean
}

export type RecurringCalendarEvent = CalendarEvent & {
  isRecurringOccurrence?: boolean
  recurrenceOccurrenceIndex?: number
  recurrenceOccurrenceStart?: string
  recurrenceOccurrenceEnd?: string
  recurrenceSeriesHandle?: number | null
}

const DEFAULT_EVENT_COLOR = '#2196F3'
const RECURRENCE_FREQUENCIES = new Set<RecurrenceFrequency>([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
])
const RECURRENCE_WEEKDAY_CODES = new Set<RecurrenceWeekdayCode>([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
])
const WEEKDAY_CODE_BY_JS_DAY: RecurrenceWeekdayCode[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export function parseRecurrenceRule(recurrenceRule?: string | null): ParsedRecurrenceRule | null {
  if (typeof recurrenceRule !== 'string') {
    return null
  }

  const trimmedRule = recurrenceRule.trim()
  if (!trimmedRule) {
    return null
  }

  const normalizedRule = trimmedRule.startsWith('RRULE:')
    ? trimmedRule.slice('RRULE:'.length).trim()
    : trimmedRule
  const values = new Map<string, string>()

  normalizedRule
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex <= 0) {
        return
      }

      const key = part.slice(0, separatorIndex).trim().toUpperCase()
      const value = part.slice(separatorIndex + 1).trim()
      if (key && value) {
        values.set(key, value)
      }
    })

  const frequency = values.get('FREQ')?.toUpperCase() as RecurrenceFrequency | undefined
  if (!frequency || !RECURRENCE_FREQUENCIES.has(frequency)) {
    return null
  }

  const intervalValue = Number.parseInt(values.get('INTERVAL') ?? '1', 10)
  const interval = Number.isFinite(intervalValue) && intervalValue > 0 ? intervalValue : 1
  const countValue = Number.parseInt(values.get('COUNT') ?? '', 10)
  const until = parseCompactUtcDate(values.get('UNTIL'))
  const byDay = (values.get('BYDAY') ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase() as RecurrenceWeekdayCode)
    .filter(
      (item, index, items) => RECURRENCE_WEEKDAY_CODES.has(item) && items.indexOf(item) === index,
    )

  return {
    raw: normalizeRecurrenceRule(normalizedRule),
    frequency,
    interval,
    byDay,
    ...(Number.isFinite(countValue) && countValue > 0 ? { count: countValue } : {}),
    ...(until ? { until } : {}),
  }
}

export function buildRecurrenceRule(input: RecurrenceRuleInput): string | null {
  if (!input || input.frequency === 'NONE') {
    return null
  }

  const frequency = input.frequency.toUpperCase() as RecurrenceFrequency
  if (!RECURRENCE_FREQUENCIES.has(frequency)) {
    return null
  }

  const interval =
    typeof input.interval === 'number' && Number.isFinite(input.interval) && input.interval > 0
      ? Math.trunc(input.interval)
      : 1

  const parts = [`FREQ=${frequency}`, `INTERVAL=${interval}`]

  if (frequency === 'WEEKLY') {
    const weekdays =
      input.weekdays && input.weekdays.length > 0
        ? Array.from(new Set(input.weekdays.filter((day) => RECURRENCE_WEEKDAY_CODES.has(day))))
        : resolveDefaultWeekdays(input.startDate)

    if (weekdays.length > 0) {
      parts.push(`BYDAY=${weekdays.join(',')}`)
    }
  }

  if (input.endMode === 'count') {
    const count =
      typeof input.count === 'number' && Number.isFinite(input.count) && input.count > 0
        ? Math.trunc(input.count)
        : null
    if (count) {
      parts.push(`COUNT=${count}`)
    }
  }

  if (input.endMode === 'until') {
    const until = formatUntilToCompactUtc(
      input.untilDate,
      input.untilTime,
      input.startTime,
      input.isAllDay,
    )
    if (until) {
      parts.push(`UNTIL=${until}`)
    }
  }

  return parts.join(';')
}

export function expandRecurringEvent(
  event: EventItem,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences = 4000,
): RecurringCalendarEvent[] {
  const parsedRule = parseRecurrenceRule(event.recurrenceRule)
  if (!parsedRule) {
    return eventOverlapsRange(event, rangeStart, rangeEnd) ? [toCalendarEvent(event)] : []
  }

  const baseStart = new Date(event.startDate)
  const baseEnd = new Date(event.endDate)
  if (!isValidDate(baseStart) || !isValidDate(baseEnd)) {
    return []
  }

  const occurrences: RecurringCalendarEvent[] = []
  const durationMs = Math.max(baseEnd.getTime() - baseStart.getTime(), 0)
  let currentStart = new Date(baseStart)
  let currentEnd = new Date(baseEnd)
  let occurrenceIndex = 0
  let iterationCount = 0

  while (iterationCount < maxOccurrences) {
    iterationCount += 1
    occurrenceIndex += 1

    if (parsedRule.count && occurrenceIndex > parsedRule.count) {
      break
    }

    if (parsedRule.until && currentStart.getTime() > parsedRule.until.getTime()) {
      break
    }

    if (rangesOverlap(currentStart, currentEnd, rangeStart, rangeEnd)) {
      occurrences.push(
        buildRecurringCalendarEvent(event, currentStart, currentEnd, occurrenceIndex),
      )
    }

    if (currentStart.getTime() > rangeEnd.getTime()) {
      break
    }

    const nextOccurrence = getNextOccurrence(currentStart, parsedRule, baseStart, durationMs)
    if (!nextOccurrence) {
      break
    }

    currentStart = nextOccurrence.start
    currentEnd = nextOccurrence.end
  }

  return occurrences
}

export function isRecurringCalendarEvent(event: CalendarEvent | null | undefined): boolean {
  if (!event) {
    return false
  }

  return Boolean(
    (event as RecurringCalendarEvent).isRecurringOccurrence || event.event?.recurrenceRule,
  )
}

export function weekdayCodeFromDate(date: Date): RecurrenceWeekdayCode {
  return WEEKDAY_CODE_BY_JS_DAY[date.getDay()] ?? 'MO'
}

export function toCalendarEvent(event: EventItem): RecurringCalendarEvent {
  return {
    name: event.title,
    color: event.type?.color || DEFAULT_EVENT_COLOR,
    start: new Date(event.startDate).getTime() || 0,
    end: new Date(event.endDate).getTime() || 0,
    timed: event.isAllDay === false,
    event,
  }
}

function buildRecurringCalendarEvent(
  event: EventItem,
  occurrenceStart: Date,
  occurrenceEnd: Date,
  occurrenceIndex: number,
): RecurringCalendarEvent {
  return {
    ...toCalendarEvent(event),
    start: occurrenceStart.getTime(),
    end: occurrenceEnd.getTime(),
    isRecurringOccurrence: true,
    recurrenceOccurrenceIndex: occurrenceIndex,
    recurrenceOccurrenceStart: occurrenceStart.toISOString(),
    recurrenceOccurrenceEnd: occurrenceEnd.toISOString(),
    recurrenceSeriesHandle: event.handle ?? null,
  }
}

function eventOverlapsRange(event: EventItem, rangeStart: Date, rangeEnd: Date): boolean {
  return rangesOverlap(new Date(event.startDate), new Date(event.endDate), rangeStart, rangeEnd)
}

function rangesOverlap(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return start.getTime() <= rangeEnd.getTime() && end.getTime() >= rangeStart.getTime()
}

function getNextOccurrence(
  currentStart: Date,
  parsedRule: ParsedRecurrenceRule,
  baseStart: Date,
  durationMs: number,
): { start: Date; end: Date } | null {
  switch (parsedRule.frequency) {
    case 'DAILY':
      return buildOccurrence(addUtcDays(currentStart, parsedRule.interval), durationMs)
    case 'WEEKLY':
      return advanceWeeklyOccurrence(currentStart, parsedRule, baseStart, durationMs)
    case 'MONTHLY':
      return advanceMonthlyOccurrence(currentStart, parsedRule.interval, baseStart, durationMs)
    case 'YEARLY':
      return advanceYearlyOccurrence(currentStart, parsedRule.interval, baseStart, durationMs)
    default:
      return null
  }
}

function advanceWeeklyOccurrence(
  currentStart: Date,
  parsedRule: ParsedRecurrenceRule,
  baseStart: Date,
  durationMs: number,
): { start: Date; end: Date } | null {
  const allowedWeekdays =
    parsedRule.byDay.length > 0 ? parsedRule.byDay : [weekdayCodeFromDate(baseStart)]
  let candidate = new Date(currentStart)

  for (let index = 0; index < 370; index += 1) {
    candidate = addUtcDays(candidate, 1)
    if (candidate.getTime() < baseStart.getTime()) {
      continue
    }

    if (!allowedWeekdays.includes(weekdayCodeFromDate(candidate))) {
      continue
    }

    if (diffWeeksFromMonday(baseStart, candidate) % parsedRule.interval !== 0) {
      continue
    }

    return buildOccurrence(candidate, durationMs)
  }

  return null
}

function advanceMonthlyOccurrence(
  currentStart: Date,
  interval: number,
  baseStart: Date,
  durationMs: number,
): { start: Date; end: Date } | null {
  for (let monthsToAdd = interval; monthsToAdd <= 1200; monthsToAdd += interval) {
    const candidate = createUtcDateWithBaseTime(
      currentStart.getUTCFullYear(),
      currentStart.getUTCMonth() + monthsToAdd,
      baseStart.getUTCDate(),
      baseStart,
    )

    if (candidate.getUTCDate() !== baseStart.getUTCDate()) {
      continue
    }

    return buildOccurrence(candidate, durationMs)
  }

  return null
}

function advanceYearlyOccurrence(
  currentStart: Date,
  interval: number,
  baseStart: Date,
  durationMs: number,
): { start: Date; end: Date } | null {
  for (let yearsToAdd = interval; yearsToAdd <= 200; yearsToAdd += interval) {
    const candidate = createUtcDateWithBaseTime(
      currentStart.getUTCFullYear() + yearsToAdd,
      baseStart.getUTCMonth(),
      baseStart.getUTCDate(),
      baseStart,
    )

    if (
      candidate.getUTCMonth() !== baseStart.getUTCMonth() ||
      candidate.getUTCDate() !== baseStart.getUTCDate()
    ) {
      continue
    }

    return buildOccurrence(candidate, durationMs)
  }

  return null
}

function buildOccurrence(start: Date, durationMs: number) {
  return {
    start,
    end: new Date(start.getTime() + durationMs),
  }
}

function addUtcDays(date: Date, days: number): Date {
  const candidate = new Date(date)
  candidate.setUTCDate(candidate.getUTCDate() + days)
  return candidate
}

function diffWeeksFromMonday(baseDate: Date, candidateDate: Date): number {
  const baseWeekStart = startOfUtcWeekMonday(baseDate)
  const candidateWeekStart = startOfUtcWeekMonday(candidateDate)
  return Math.floor((candidateWeekStart.getTime() - baseWeekStart.getTime()) / 604800000)
}

function startOfUtcWeekMonday(date: Date): Date {
  const candidate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = candidate.getUTCDay()
  const delta = day === 0 ? -6 : 1 - day
  candidate.setUTCDate(candidate.getUTCDate() + delta)
  return candidate
}

function createUtcDateWithBaseTime(year: number, month: number, day: number, baseTime: Date): Date {
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      baseTime.getUTCHours(),
      baseTime.getUTCMinutes(),
      baseTime.getUTCSeconds(),
      baseTime.getUTCMilliseconds(),
    ),
  )
}

function resolveDefaultWeekdays(startDate?: string | Date | null): RecurrenceWeekdayCode[] {
  const date = toDate(startDate)
  return date ? [weekdayCodeFromDate(date)] : []
}

function toDate(value?: string | Date | null): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsedDate = new Date(trimmedValue)
  return isValidDate(parsedDate) ? parsedDate : null
}

function formatUntilToCompactUtc(
  untilDate?: string | null,
  untilTime?: string | null,
  startTime?: string | null,
  isAllDay?: boolean,
): string | null {
  if (typeof untilDate !== 'string' || !untilDate.trim()) {
    return null
  }

  const timeSource = isAllDay ? '23:59' : untilTime?.trim() || startTime?.trim() || '23:59'
  const localDateTime = toLocalDateTime(untilDate.trim(), timeSource)
  if (!localDateTime) {
    return null
  }

  return [
    localDateTime.getUTCFullYear(),
    String(localDateTime.getUTCMonth() + 1).padStart(2, '0'),
    String(localDateTime.getUTCDate()).padStart(2, '0'),
    'T',
    String(localDateTime.getUTCHours()).padStart(2, '0'),
    String(localDateTime.getUTCMinutes()).padStart(2, '0'),
    String(localDateTime.getUTCSeconds()).padStart(2, '0'),
    'Z',
  ].join('')
}

function toLocalDateTime(dateValue: string, timeValue: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue)
  if (!dateMatch || !timeMatch) {
    return null
  }

  const [, year, month, day] = dateMatch
  const [, hours, minutes, seconds] = timeMatch
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds ?? '0'),
  )

  return isValidDate(date) ? date : null
}

function parseCompactUtcDate(value?: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const normalizedValue = value.trim().toUpperCase()
  const fullMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(normalizedValue)

  if (fullMatch) {
    const [, year, month, day, hours, minutes, seconds] = fullMatch
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
      ),
    )
  }

  return undefined
}

function normalizeRecurrenceRule(rule: string): string {
  return rule
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(';')
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}
