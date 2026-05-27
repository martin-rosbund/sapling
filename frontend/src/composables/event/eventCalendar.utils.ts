import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import type {
  CompanyItem,
  EventItem,
  HolidayGroupItem,
  HolidayItem,
  PersonItem,
  SaplingGenericItem,
  WorkHourItem,
  WorkHourWeekItem,
} from '@/entity/entity'
import type { EntityTemplate } from '@/entity/structure'
import {
  getEventDateParts,
  isValidDate,
  parseLocalCalendarDate,
  type CalendarType,
} from './eventDate.utils'

export type CalendarViewMode = 'single' | 'sidebyside'
export type CalendarMode = 'default' | 'extended'
export type CalendarParticipant = PersonItem | number | string
export type CalendarRecord = EventItem | HolidayItem
export type CalendarSource = 'event' | 'holiday'
export type SaplingCalendarEvent = CalendarEvent & {
  event?: CalendarRecord
  saplingSource?: CalendarSource
}
export type EditableEventPayload = Omit<
  Partial<EventItem>,
  'startDate' | 'endDate' | 'creatorPerson' | 'creatorCompany'
> & {
  startDate: string
  endDate: string
  creatorPerson?: PersonItem
  creatorCompany?: CompanyItem
  assigneePerson?: PersonItem
  assigneeCompany?: CompanyItem
  startDate_date: string
  startDate_time: string
  endDate_date: string
  endDate_time: string
}

export const DEFAULT_EVENT_COLOR = '#2196F3'
export const DEFAULT_HOLIDAY_COLOR = '#C62828'

const WORKWEEK_DAYS = [1, 2, 3, 4, 5]

export function getItemHandle(item?: SaplingGenericItem | null): string | number | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const { handle } = item
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
}

export function toEditableEventItem(event: CalendarEvent | null): SaplingGenericItem | null {
  if (!event || isReadonlyCalendarEvent(event)) {
    return null
  }

  const item = event.event
  if (item && typeof item === 'object') {
    return item as SaplingGenericItem
  }

  return event as SaplingGenericItem
}

export function normalizeConcurrencyTimestamp(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const rawValue = String(value).trim()
  if (!rawValue) {
    return null
  }

  const parsedDate = new Date(rawValue)
  return Number.isNaN(parsedDate.getTime()) ? rawValue : parsedDate.toISOString()
}

export function buildConcurrencyPayload(
  templates: EntityTemplate[],
  source: SaplingGenericItem | null,
): Record<string, unknown> | null {
  if (!source) {
    return null
  }

  const payload: Record<string, unknown> = {}

  templates.filter(isConcurrencyComparableTemplate).forEach((template) => {
    if (!template.name || !Object.prototype.hasOwnProperty.call(source, template.name)) {
      return
    }

    payload[template.name] = normalizeConcurrencyPayloadValue(source[template.name], template)
  })

  return payload
}

export function buildConcurrencyOptions(
  templates: EntityTemplate[],
  source: SaplingGenericItem | null,
) {
  return {
    expectedUpdatedAt: normalizeConcurrencyTimestamp(source?.updatedAt),
    basePayload: buildConcurrencyPayload(templates, source),
    resolution: 'detect' as const,
  }
}

export function normalizeConcurrencyPayloadValue(
  value: unknown,
  template: EntityTemplate,
): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (template.type === 'datetime' && typeof value === 'string') {
    return normalizeConcurrencyTimestamp(value) ?? value
  }

  return value ?? null
}

export function isConcurrencyComparableTemplate(template: EntityTemplate): boolean {
  if (!template.name || template.isPersistent === false) {
    return false
  }

  if (template.kind === 'm:1') {
    return true
  }

  if (template.isReference) {
    return false
  }

  return !['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind ?? '')
}

export function toCalendarEvent(event: EventItem): SaplingCalendarEvent {
  return {
    name: event.title,
    color: event.type?.color || DEFAULT_EVENT_COLOR,
    start: new Date(event.startDate).getTime() || 0,
    end: new Date(event.endDate).getTime() || 0,
    timed: event.isAllDay === false,
    event,
    saplingSource: 'event',
  }
}

export function toHolidayCalendarEvent(holiday: HolidayItem): SaplingCalendarEvent {
  return {
    name: holiday.title,
    color: holiday.color || DEFAULT_HOLIDAY_COLOR,
    start: new Date(holiday.startDate).getTime() || 0,
    end: new Date(holiday.endDate).getTime() || 0,
    timed: holiday.isAllDay === false,
    event: holiday,
    saplingSource: 'holiday',
  }
}

export function isReadonlyCalendarEvent(event: CalendarEvent | null | undefined): boolean {
  return (event as SaplingCalendarEvent | null | undefined)?.saplingSource === 'holiday'
}

export function toPersistedEventItem(event: CalendarEvent | null | undefined): EventItem | null {
  if (!event || isReadonlyCalendarEvent(event)) {
    return null
  }

  const item = event.event as EventItem | undefined
  return item?.handle == null ? null : item
}

export function getCalendarEventTitle(event: CalendarEvent, fallbackLabel: string): string {
  return event.event?.title || event.name || fallbackLabel
}

export function getCalendarEventDescription(event: CalendarEvent): string {
  return event.event?.description || ''
}

export function getCalendarEventIcon(event: CalendarEvent) {
  if (isReadonlyCalendarEvent(event)) {
    return (event.event as HolidayItem | undefined)?.icon || 'mdi-calendar-alert'
  }

  return (event.event as EventItem | undefined)?.type?.icon || 'mdi-calendar-clock-outline'
}

export function getCalendarEventAccentColor(event: CalendarEvent, fallbackColor: string) {
  if (isReadonlyCalendarEvent(event)) {
    return (event.event as HolidayItem | undefined)?.color || fallbackColor
  }

  return (event.event as EventItem | undefined)?.status?.color || fallbackColor
}

export function filterWorkweekEvents(
  calendarEvents: SaplingCalendarEvent[],
  calendarType: CalendarType,
) {
  if (calendarType !== 'workweek') {
    return calendarEvents
  }

  return calendarEvents.filter((event) => overlapsWorkweek(event.start, event.end))
}

export function filterByCalendarMode(
  calendarEvents: SaplingCalendarEvent[],
  calendarMode: CalendarMode,
) {
  if (calendarMode === 'extended') {
    return calendarEvents
  }

  return calendarEvents.filter((event) => {
    if (event.saplingSource !== 'event') {
      return true
    }

    const typeRecord = (event.event as EventItem | undefined)?.type
    if (typeRecord?.showInDefaultCalendar === false) {
      return false
    }

    return typeRecord?.isStandardCalendar !== false
  })
}

export function overlapsWorkweek(start: number | string | Date, end: number | string | Date) {
  const current = new Date(start)
  const endDate = new Date(end)
  if (!isValidDate(current) || !isValidDate(endDate)) {
    return false
  }

  current.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  while (current <= endDate) {
    const day = current.getDay()
    if (WORKWEEK_DAYS.includes(day)) {
      return true
    }

    current.setDate(current.getDate() + 1)
  }

  return false
}

export function buildDraftEventPayload(
  event: CalendarEvent,
  ownPerson: PersonItem | null,
  selectedPeople: number[],
): EditableEventPayload {
  const startDateParts = getEventDateParts(event.start)
  const endDateParts = getEventDateParts(event.end)
  const participants = resolveDraftParticipants(event, selectedPeople)

  return {
    title: event.name,
    startDate: startDateParts.iso,
    endDate: endDateParts.iso,
    creatorPerson: ownPerson ?? undefined,
    creatorCompany: ownPerson?.company ?? undefined,
    assigneePerson: ownPerson ?? undefined,
    assigneeCompany: ownPerson?.company ?? undefined,
    participants,
    startDate_date: startDateParts.date,
    startDate_time: startDateParts.time,
    endDate_date: endDateParts.date,
    endDate_time: endDateParts.time,
  }
}

export function resolveDraftParticipants(event: CalendarEvent, selectedPeople: number[]) {
  const explicitParticipants = normalizeParticipantHandles(event.participants)
  if (explicitParticipants.length > 0) {
    return explicitParticipants
  }

  const nestedParticipants = normalizeParticipantHandles(event.event?.participants)
  if (nestedParticipants.length > 0) {
    return nestedParticipants
  }

  return [...selectedPeople]
}

export function normalizeParticipantHandles(participants: unknown) {
  if (!Array.isArray(participants)) {
    return [] as number[]
  }

  return Array.from(
    new Set(
      participants
        .map((participant) => resolveParticipantHandle(participant as CalendarParticipant))
        .filter((handle): handle is number => handle != null),
    ),
  )
}

export function normalizeParticipantNames(
  participants: unknown,
  resolveParticipantName: (participant: CalendarParticipant) => string | null | undefined,
) {
  if (!Array.isArray(participants)) {
    return [] as string[]
  }

  const seen = new Set<string>()

  return participants.reduce<string[]>((names, participant) => {
    const calendarParticipant = participant as CalendarParticipant
    const handle = resolveParticipantHandle(calendarParticipant)
    const name = resolveParticipantName(calendarParticipant)
    if (!name) {
      return names
    }

    const key = handle != null ? `handle:${handle}` : `name:${name}`
    if (seen.has(key)) {
      return names
    }

    seen.add(key)
    names.push(name)
    return names
  }, [])
}

export function applyCalendarEventDateParts(event: CalendarEvent | null) {
  if (!event?.event) {
    return
  }

  const startDateParts = getEventDateParts(event.start)
  const endDateParts = getEventDateParts(event.end)

  event.event = {
    ...event.event,
    startDate: startDateParts.iso,
    endDate: endDateParts.iso,
    startDate_date: startDateParts.date,
    startDate_time: startDateParts.time,
    endDate_date: endDateParts.date,
    endDate_time: endDateParts.time,
  }
}

export function hasParticipant(event: CalendarEvent, personId: number) {
  if (!Array.isArray(event.event?.participants)) {
    return false
  }

  return event.event.participants.some(
    (participant: CalendarParticipant) => resolveParticipantHandle(participant) === personId,
  )
}

export function resolveParticipantHandle(participant: CalendarParticipant) {
  if (typeof participant === 'number') {
    return participant
  }

  if (typeof participant === 'string') {
    const parsed = Number.parseInt(participant, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  return participant.handle ?? null
}

export function resolveHolidayGroupHandle(
  holidayGroup: HolidayGroupItem | number | null | undefined,
) {
  if (typeof holidayGroup === 'number') {
    return holidayGroup
  }

  return holidayGroup?.handle ?? null
}

export function resolvePersonHolidayGroupHandle(person: PersonItem | null | undefined) {
  const ownHolidayGroupHandle = resolveHolidayGroupHandle(person?.holidayGroup)
  if (ownHolidayGroupHandle != null) {
    return ownHolidayGroupHandle
  }

  if (!person?.company || typeof person.company === 'number') {
    return null
  }

  return resolveHolidayGroupHandle(person.company.holidayGroup)
}

export function getWorkHourForDate(
  workHours: WorkHourWeekItem | null,
  date: string,
): WorkHourItem | null {
  if (!workHours) {
    return null
  }

  const day = parseLocalCalendarDate(date).getDay()
  switch (day) {
    case 0:
      return workHours.sunday as WorkHourItem
    case 1:
      return workHours.monday as WorkHourItem
    case 2:
      return workHours.tuesday as WorkHourItem
    case 3:
      return workHours.wednesday as WorkHourItem
    case 4:
      return workHours.thursday as WorkHourItem
    case 5:
      return workHours.friday as WorkHourItem
    case 6:
      return workHours.saturday as WorkHourItem
    default:
      return null
  }
}

export function getCalendarEventHandle(event: CalendarEvent | null) {
  return event?.event?.handle ?? event?.handle ?? null
}
