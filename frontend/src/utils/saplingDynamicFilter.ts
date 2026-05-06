import type { PersonItem } from '@/entity/entity'

type DynamicFilterContext = {
  currentPerson?: PersonItem | null
  referenceDate?: Date
}

const DYNAMIC_FILTER_TOKENS = {
  currentPersonHandle: '{{currentPerson.handle}}',
  currentCompanyHandle: '{{currentCompany.handle}}',
  todayStart: '{{today.start}}',
  tomorrowStart: '{{tomorrow.start}}',
  dayAfterTomorrowStart: '{{dayAfterTomorrow.start}}',
  weekStart: '{{week.start}}',
  weekEnd: '{{week.end}}',
  monthStart: '{{month.start}}',
  monthEnd: '{{month.end}}',
  now: '{{now}}',
} as const

export function resolveDynamicFilter<T>(value: T, context: DynamicFilterContext = {}): T {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveDynamicFilter(entry, context)) as T
  }

  if (typeof value === 'string') {
    return resolveDynamicFilterToken(value, context) as T
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveDynamicFilter(entry, context)]),
    ) as T
  }

  return value
}

function resolveDynamicFilterToken(value: string, context: DynamicFilterContext) {
  const referenceDate = context.referenceDate ?? new Date()
  const currentPersonHandle = context.currentPerson?.handle
  const currentCompanyHandle =
    typeof context.currentPerson?.company === 'object'
      ? context.currentPerson.company?.handle
      : context.currentPerson?.company

  switch (value) {
    case DYNAMIC_FILTER_TOKENS.currentPersonHandle:
      return currentPersonHandle ?? value
    case DYNAMIC_FILTER_TOKENS.currentCompanyHandle:
      return currentCompanyHandle ?? value
    case DYNAMIC_FILTER_TOKENS.todayStart:
      return toIsoAtStartOfDay(referenceDate)
    case DYNAMIC_FILTER_TOKENS.tomorrowStart:
      return toIsoAtStartOfDay(addDays(referenceDate, 1))
    case DYNAMIC_FILTER_TOKENS.dayAfterTomorrowStart:
      return toIsoAtStartOfDay(addDays(referenceDate, 2))
    case DYNAMIC_FILTER_TOKENS.weekStart:
      return toIsoAtStartOfDay(startOfWeek(referenceDate))
    case DYNAMIC_FILTER_TOKENS.weekEnd:
      return toIsoAtStartOfDay(addDays(startOfWeek(referenceDate), 7))
    case DYNAMIC_FILTER_TOKENS.monthStart:
      return toIsoAtStartOfDay(startOfMonth(referenceDate))
    case DYNAMIC_FILTER_TOKENS.monthEnd:
      return toIsoAtStartOfDay(startOfNextMonth(referenceDate))
    case DYNAMIC_FILTER_TOKENS.now:
      return new Date(referenceDate).toISOString()
    default:
      return value
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date)
  const dayOfWeek = nextDate.getDay()
  const normalizedOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  nextDate.setDate(nextDate.getDate() + normalizedOffset)
  return nextDate
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

function toIsoAtStartOfDay(date: Date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate.toISOString()
}
