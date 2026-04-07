import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance, CSSProperties } from 'vue'
import ApiGenericService from '@/services/api.generic.service'
import type {
  EntityItem,
  EventItem,
  PersonItem,
  WorkHourItem,
  WorkHourWeekItem,
} from '@/entity/entity'
import type { EntityTemplate } from '@/entity/structure'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiService from '@/services/api.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'
import { i18n } from '@/i18n'

interface CalendarDatePair {
  start: CalendarDateItem
  end: CalendarDateItem
}

interface CalendarDateItem {
  date: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

interface EventDateParts {
  iso: string
  date: string
  time: string
}

type CalendarType = 'workweek' | 'month' | 'day' | 'week'
type CalendarViewMode = 'single' | 'sidebyside'
type CalendarParticipant = PersonItem | number | string
type CalendarScrollContainerRef = HTMLElement | ComponentPublicInstance | null
type EditableEventPayload = Omit<Partial<EventItem>, 'startDate' | 'endDate' | 'creator'> & {
  startDate: string
  endDate: string
  creator?: PersonItem
  startDate_date: string
  startDate_time: string
  endDate_date: string
  endDate_time: string
}

const DEFAULT_EVENT_COLOR = '#2196F3'
const WORKWEEK_DAYS = [1, 2, 3, 4, 5]
const CALENDAR_TYPE_OPTIONS: CalendarType[] = ['day', 'workweek', 'week', 'month']
const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

/**
 * Centralizes all state, lifecycle hooks and UI helpers for the event calendar screen.
 * The component stays template-focused while the composable owns loading, responsiveness
 * and calendar-specific interaction logic.
 */
export function useSaplingEvent() {
  //#region State
  const { isLoading, loadTranslations } = useTranslationLoader(
    'navigation',
    'calendar',
    'global',
    'event',
    'eventStatus',
  )
  const currentPersonStore = useCurrentPersonStore()
  const windowWatcher = new SaplingWindowWatcher()
  const { peopleMap } = useSaplingFilterWork()

  const ownPerson = ref<PersonItem | null>(null)
  const events = ref<CalendarEvent[]>([])
  const templates = ref<EntityTemplate[]>([])
  const selectedPeoples = ref<number[]>([])
  const calendarType = ref<CalendarType>(
    windowWatcher.getCurrentSize() === 'small' ? 'day' : 'workweek',
  )
  const calendarViewMode = ref<CalendarViewMode>('single')
  const isNarrowScreen = ref(windowWatcher.getCurrentSize() === 'small')
  const entityEvent = ref<EntityItem | null>(null)
  const editEvent = ref<CalendarEvent | null>(null)
  const calendarDateRange = ref<CalendarDatePair | null>(null)
  const showEditDialog = ref(false)
  const dragEvent = ref<CalendarEvent | null>(null)
  const dragTime = ref<number | null>(null)
  const createEvent = ref<CalendarEvent | null>(null)
  const createStart = ref<number | null>(null)
  const extendOriginal = ref<number | null>(null)
  const value = ref(formatLocalDate(new Date()))
  const calendarScrollContainer = ref<CalendarScrollContainerRef>(null)
  const workHours = ref<WorkHourWeekItem | null>(null)

  let stopWindowWatcher: (() => void) | null = null
  let scrollTimeoutId: number | null = null

  const calendarDisplayType = computed(() =>
    calendarType.value === 'workweek' ? 'week' : calendarType.value,
  )
  const calendarWeekdays = computed(() =>
    calendarType.value === 'workweek' ? WORKWEEK_DAYS : undefined,
  )
  const showWorkHourBackground = computed(() =>
    ['day', 'week', 'workweek'].includes(calendarType.value),
  )

  const currentMonthLabel = computed(() => {
    if (!value.value) {
      return ''
    }

    const date = parseLocalCalendarDate(value.value)
    if (!isValidDate(date)) {
      return ''
    }

    const month = i18n.global.t(`event.${MONTH_NAMES[date.getMonth()]}`)
    const calendarWeek = i18n.global.t('event.kalendarWeek')

    if (calendarType.value === 'month') {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      return `${month} ${date.getFullYear()} · ${calendarWeek} ${getWeekNumber(firstDay)}–${getWeekNumber(lastDay)}`
    }

    return `${month} ${date.getFullYear()} · ${calendarWeek} ${getWeekNumber(date)}`
  })
  //#endregion

  //#region Lifecycle
  stopWindowWatcher = windowWatcher.onChange((size) => {
    const isSmall = size === 'small'
    isNarrowScreen.value = isSmall

    if (isSmall) {
      calendarType.value = 'day'
      calendarViewMode.value = 'single'
      return
    }

    if (calendarType.value === 'day') {
      calendarType.value = 'workweek'
    }
  })

  onMounted(async () => {
    await Promise.all([
      loadTranslations(),
      loadOwnPerson(),
      loadEventEntity(),
      loadTemplates(),
      loadWorkHours(),
    ])

    queueScrollToCurrentTime()
  })

  onBeforeUnmount(() => {
    if (scrollTimeoutId !== null) {
      window.clearTimeout(scrollTimeoutId)
    }

    stopWindowWatcher?.()
    windowWatcher.destroy()
  })

  watch(
    selectedPeoples,
    async () => {
      await refreshVisibleEvents()
    },
    { deep: true },
  )

  watch([calendarType, calendarViewMode, value], () => {
    void nextTick(() => {
      queueScrollToCurrentTime()
    })
  })
  //#endregion

  //#region Loading
  /**
   * Loads the signed-in person and initializes the default participant filter.
   */
  async function loadOwnPerson() {
    await currentPersonStore.fetchCurrentPerson()
    ownPerson.value = currentPersonStore.person
    selectedPeoples.value = ownPerson.value?.handle != null ? [ownPerson.value.handle] : []
  }

  /**
   * Loads the event templates used by the shared edit dialog.
   */
  async function loadTemplates() {
    templates.value = await ApiService.findAll<EntityTemplate[]>('template/event')
  }

  /**
   * Loads the entity metadata for the event dialog.
   */
  async function loadEventEntity() {
    entityEvent.value =
      (
        await ApiGenericService.find<EntityItem>('entity', {
          filter: { handle: 'event' },
          limit: 1,
          page: 1,
        })
      ).data[0] || null
  }

  /**
   * Loads the user's work week to render working-hour background blocks.
   */
  async function loadWorkHours() {
    workHours.value = await ApiService.findOne<WorkHourWeekItem>('current/workWeek')
  }

  /**
   * Reloads the current calendar range when a valid range is already known.
   */
  async function refreshVisibleEvents() {
    if (!calendarDateRange.value) {
      return
    }

    await getEvents(calendarDateRange.value)
  }
  //#endregion

  //#region Calendar Helpers
  /**
   * Returns the vertical position of the current-time marker in percent.
   */
  function nowY() {
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    return `${(minutes / (24 * 60)) * 100}%`
  }

  /**
   * Parses a yyyy-mm-dd date without converting it through UTC.
   */
  function parseLocalCalendarDate(input: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
    if (!match) {
      return new Date(input)
    }

    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  /**
   * Moves the calendar to today's date.
   */
  function goToToday() {
    value.value = formatLocalDate(new Date())
  }

  /**
   * Navigates one logical unit backward based on the active calendar type.
   */
  function goToPrevious() {
    shiftCalendar(-1)
  }

  /**
   * Navigates one logical unit forward based on the active calendar type.
   */
  function goToNext() {
    shiftCalendar(1)
  }

  /**
   * Applies the correct day, week or month shift to the active calendar date.
   */
  function shiftCalendar(direction: 1 | -1) {
    const current = value.value ? parseLocalCalendarDate(value.value) : new Date()
    const nextDate = new Date(current)

    switch (calendarType.value) {
      case 'day':
        nextDate.setDate(current.getDate() + direction)
        break
      case 'workweek':
      case 'week':
        nextDate.setDate(current.getDate() + 7 * direction)
        break
      case 'month':
        nextDate.setMonth(current.getMonth() + direction)
        break
    }

    value.value = formatLocalDate(nextDate)
  }

  /**
   * Scrolls the visible calendar column toward the current-time marker.
   */
  function scrollToCurrentTime() {
    const outer =
      resolveScrollContainerElement(calendarScrollContainer.value) ||
      document.querySelector('.calendar-card-text')
    if (!outer) {
      return
    }

    const scrollArea = outer.querySelector(
      '.v-calendar-daily__scroll-area, .v-calendar-weekly__scroll-area, .v-calendar-monthly__scroll-area',
    ) as HTMLElement | null
    const container = scrollArea || outer
    const markers = Array.from(container.querySelectorAll('.v-current-time')) as HTMLElement[]

    if (markers.length === 0) {
      queueScrollToCurrentTime(200)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const containerMiddle = containerRect.top + containerRect.height / 2
    let bestMarker: HTMLElement | null = null
    let minDistance = Number.POSITIVE_INFINITY

    markers.forEach((marker) => {
      const markerRect = marker.getBoundingClientRect()
      const markerMiddle = markerRect.top + markerRect.height / 2
      const distance = Math.abs(markerMiddle - containerMiddle)

      if (distance < minDistance) {
        minDistance = distance
        bestMarker = marker
      }
    })

    const resolvedMarker = bestMarker as HTMLElement | null
    if (!resolvedMarker || container.scrollHeight <= container.clientHeight) {
      return
    }

    const markerRect = resolvedMarker.getBoundingClientRect()
    const offset =
      markerRect.top -
      containerRect.top +
      container.scrollTop -
      containerRect.height / 2 +
      markerRect.height / 2
    container.style.scrollBehavior = 'smooth'
    container.scrollTo({ top: offset })

    window.setTimeout(() => {
      container.style.scrollBehavior = ''
    }, 500)
  }

  /**
   * Schedules the calendar scroll after the DOM has been updated.
   */
  function queueScrollToCurrentTime(delay = 300) {
    if (scrollTimeoutId !== null) {
      window.clearTimeout(scrollTimeoutId)
    }

    scrollTimeoutId = window.setTimeout(() => {
      scrollTimeoutId = null
      scrollToCurrentTime()
    }, delay)
  }

  /**
   * Normalizes template refs from Vuetify components to their underlying DOM element.
   */
  function resolveScrollContainerElement(target: CalendarScrollContainerRef): HTMLElement | null {
    if (!target) {
      return null
    }

    if (target instanceof HTMLElement) {
      return target
    }

    const element = target.$el
    return element instanceof HTMLElement ? element : null
  }

  /**
   * Maps a work-day definition to the absolute overlay style used in the calendar body.
   */
  function getWorkHourStyle(date: string): CSSProperties {
    if (!workHours.value) {
      return {}
    }

    const weekDay = getWorkHourForDate(date)
    if (!weekDay?.timeFrom || !weekDay?.timeTo) {
      return {}
    }

    const [fromHours = 0, fromMinutes = 0] = weekDay.timeFrom.split(':').map(Number)
    const [toHours = 0, toMinutes = 0] = weekDay.timeTo.split(':').map(Number)
    const fromMin = fromHours * 60 + fromMinutes
    const toMin = toHours * 60 + toMinutes

    return {
      position: 'absolute',
      left: '0px',
      right: '0px',
      top: `${(fromMin / (24 * 60)) * 100}%`,
      height: `${((toMin - fromMin) / (24 * 60)) * 100}%`,
      background: 'rgba(100,180,255,0.15)',
      zIndex: '0',
      pointerEvents: 'none',
    }
  }
  //#endregion

  //#region Events
  /**
   * Loads all events for the visible calendar range and active participant filter.
   */
  async function getEvents(nextRange: CalendarDatePair) {
    calendarDateRange.value = nextRange

    const startDate = parseLocalCalendarDate(nextRange.start.date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = parseLocalCalendarDate(nextRange.end.date)
    endDate.setHours(23, 59, 59, 999)

    const response = await ApiGenericService.find<EventItem>('event', {
      relations: ['participants', 'm:1'],
      filter: {
        startDate: { $lte: endDate.toISOString() },
        endDate: { $gte: startDate.toISOString() },
        participants: selectedPeoples.value,
      },
    })

    events.value = filterWorkweekEvents(response.data.map(toCalendarEvent))
  }

  /**
   * Updates the selected people from the filter drawer.
   */
  function onSelectedPeoplesUpdate(values: string[]) {
    selectedPeoples.value = values
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => !Number.isNaN(value))
  }

  /**
   * Starts dragging an existing timed event.
   */
  function startDrag(
    _nativeEvent: Event,
    { event, timed }: { event: CalendarEvent; timed: boolean },
  ) {
    if (!event || !timed) {
      return
    }

    dragEvent.value = event
    dragTime.value = null
    extendOriginal.value = null
  }

  /**
   * Starts a new timed event or initializes dragging offset for an existing one.
   */
  function startTime(_nativeEvent: Event, timeSlot: CalendarDateItem) {
    const mouseTime = toTime(timeSlot)

    if (dragEvent.value && dragTime.value === null) {
      dragTime.value = mouseTime - dragEvent.value.start
      return
    }

    createStart.value = roundTime(mouseTime)
    createEvent.value = {
      color: DEFAULT_EVENT_COLOR,
      start: createStart.value,
      end: createStart.value,
      timed: true,
    }
    events.value.push(createEvent.value)
  }

  /**
   * Enables bottom-resize interactions for an existing draft event.
   */
  function extendBottom(event: CalendarEvent) {
    createEvent.value = event
    createStart.value = event.start
    extendOriginal.value = event.end
  }

  /**
   * Updates draft or dragged event positions while the pointer moves.
   */
  function mouseMove(_nativeEvent: Event, timeSlot: CalendarDateItem) {
    const mouseTime = toTime(timeSlot)

    if (dragEvent.value && dragTime.value !== null) {
      const duration = dragEvent.value.end - dragEvent.value.start
      const newStart = roundTime(mouseTime - dragTime.value)
      dragEvent.value.start = newStart
      dragEvent.value.end = newStart + duration
      return
    }

    if (!createEvent.value || createStart.value === null) {
      return
    }

    const mouseRounded = roundTime(mouseTime, false)
    createEvent.value.start = Math.min(mouseRounded, createStart.value)
    createEvent.value.end = Math.max(mouseRounded, createStart.value)
  }

  /**
   * Finalizes drag interactions and opens the edit dialog with normalized date fields.
   */
  function endDrag() {
    if (createEvent.value && getCalendarEventHandle(createEvent.value) == null) {
      editEvent.value = createEvent.value
      editEvent.value.event = buildDraftEventPayload(createEvent.value)
      showEditDialog.value = true
    } else {
      editEvent.value = dragEvent.value ?? createEvent.value
      applyCalendarEventDateParts(editEvent.value)
      showEditDialog.value = editEvent.value != null
    }

    dragTime.value = null
    dragEvent.value = null
    createEvent.value = null
    createStart.value = null
    extendOriginal.value = null
  }

  /**
   * Cancels the current drag or create interaction and restores local draft state.
   */
  function cancelDrag() {
    if (createEvent.value) {
      if (extendOriginal.value != null) {
        createEvent.value.end = extendOriginal.value
      } else {
        const index = events.value.indexOf(createEvent.value)
        if (index !== -1) {
          events.value.splice(index, 1)
        }
      }
    }

    createEvent.value = null
    createStart.value = null
    dragTime.value = null
    dragEvent.value = null
    extendOriginal.value = null
  }

  /**
   * Resolves the visible color and applies a translucent state while dragging.
   */
  function getEventColor(event: CalendarEvent): string {
    const color =
      typeof event.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(event.color)
        ? event.color
        : DEFAULT_EVENT_COLOR.toLowerCase()

    if (event !== dragEvent.value && event !== createEvent.value) {
      return color
    }

    const rgb = Number.parseInt(color.slice(1), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = rgb & 0xff
    return `rgba(${r}, ${g}, ${b}, 0.7)`
  }

  /**
   * Persists the event returned from the shared edit dialog and refreshes the calendar.
   */
  async function onEditDialogSave(updatedEvent: CalendarEvent) {
    const eventPayload: CalendarEvent = { ...updatedEvent }

    if (getCalendarEventHandle(eventPayload) == null) {
      eventPayload.participants = [...selectedPeoples.value]
    }

    applyCalendarEventDateParts(eventPayload)

    const editingHandle = getCalendarEventHandle(editEvent.value)
    if (editingHandle == null) {
      const savedEvent = await ApiGenericService.create<EventItem>('event', eventPayload)
      replaceLocalEvent(editEvent.value, eventPayload, savedEvent)
    } else {
      const savedEvent = await ApiGenericService.update<EventItem>(
        'event',
        editingHandle,
        eventPayload,
      )
      replaceLocalEvent(editEvent.value, updatedEvent, savedEvent)
    }

    showEditDialog.value = false
    editEvent.value = null
    createEvent.value = null
    await refreshVisibleEvents()
  }

  /**
   * Restores the calendar state after the edit dialog is dismissed.
   */
  async function onEditDialogCancel() {
    showEditDialog.value = false
    editEvent.value = null
    await refreshVisibleEvents()
  }

  /**
   * Returns only the events that belong to the requested person.
   */
  function getEventsForPerson(personId: number) {
    return events.value.filter((event) => hasParticipant(event, personId))
  }

  /**
   * Returns the per-person event list for side-by-side mode, including the active draft.
   */
  function getSideBySideEvents(personId: number) {
    const personEvents = getEventsForPerson(personId)
    const draftEvent = getDraftEventForPerson(personId)
    return draftEvent ? [...personEvents, draftEvent] : personEvents
  }

  /**
   * Resolves a readable display name for the selected person columns.
   */
  function getPersonName(personId: number) {
    const person = peopleMap.value[personId]
    if (person) {
      const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim()
      return person.displayName || fullName || person.name || person.email || `Person ${personId}`
    }

    if (ownPerson.value?.handle === personId) {
      const ownName = ownPerson.value.displayName || ownPerson.value.name || ownPerson.value.email
      return ownName || `Person ${personId}`
    }

    return `Person ${personId}`
  }
  //#endregion

  //#region Internal Helpers
  /**
   * Creates the calendar event shape used by Vuetify from a persisted backend entity.
   */
  function toCalendarEvent(event: EventItem): CalendarEvent {
    return {
      name: event.title,
      color: event.type?.color || DEFAULT_EVENT_COLOR,
      start: new Date(event.startDate).getTime() || 0,
      end: new Date(event.endDate).getTime() || 0,
      timed: event.isAllDay === false,
      event,
    }
  }

  /**
   * Keeps workweek mode focused on Monday-Friday even for multi-day events.
   */
  function filterWorkweekEvents(calendarEvents: CalendarEvent[]) {
    if (calendarType.value !== 'workweek') {
      return calendarEvents
    }

    return calendarEvents.filter((event) => overlapsWorkweek(event.start, event.end))
  }

  /**
   * Checks whether an event range touches at least one weekday.
   */
  function overlapsWorkweek(start: number | string | Date, end: number | string | Date) {
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

  /**
   * Builds a new event payload for the edit dialog from an in-memory draft.
   */
  function buildDraftEventPayload(event: CalendarEvent): EditableEventPayload {
    const startDateParts = getEventDateParts(event.start)
    const endDateParts = getEventDateParts(event.end)

    return {
      title: event.name,
      startDate: startDateParts.iso,
      endDate: endDateParts.iso,
      creator: ownPerson.value ?? undefined,
      startDate_date: startDateParts.date,
      startDate_time: startDateParts.time,
      endDate_date: endDateParts.date,
      endDate_time: endDateParts.time,
    }
  }

  /**
   * Normalizes start and end timestamps onto the nested event payload expected by the dialog.
   */
  function applyCalendarEventDateParts(event: CalendarEvent | null) {
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

  /**
   * Replaces a local calendar entry with the saved backend result.
   */
  function replaceLocalEvent(
    targetEvent: CalendarEvent | null,
    baseEvent: CalendarEvent,
    savedEvent: EventItem,
  ) {
    if (!targetEvent) {
      return
    }

    const index = events.value.indexOf(targetEvent)
    if (index === -1) {
      return
    }

    events.value[index] = {
      ...baseEvent,
      ...savedEvent,
      event: savedEvent,
      name: savedEvent.title,
      color: savedEvent.type?.color || DEFAULT_EVENT_COLOR,
      start: new Date(savedEvent.startDate).getTime() || 0,
      end: new Date(savedEvent.endDate).getTime() || 0,
      timed: savedEvent.isAllDay === false,
    }
  }

  /**
   * Returns the pending draft event for a side-by-side person column when applicable.
   */
  function getDraftEventForPerson(personId: number) {
    if (calendarViewMode.value !== 'sidebyside' || !createEvent.value) {
      return null
    }

    const participants = createEvent.value.event?.participants
    if (Array.isArray(participants) && participants.length > 0) {
      const includesPerson = participants.some(
        (participant) => resolveParticipantHandle(participant) === personId,
      )
      if (!includesPerson) {
        return null
      }
    }

    return {
      ...createEvent.value,
      event: {
        ...(createEvent.value.event || {}),
        participants: [personId],
      },
    }
  }

  /**
   * Checks whether a calendar event is assigned to a person, supporting both ids and full objects.
   */
  function hasParticipant(event: CalendarEvent, personId: number) {
    if (!Array.isArray(event.event?.participants)) {
      return false
    }

    return event.event.participants.some(
      (participant: CalendarParticipant) => resolveParticipantHandle(participant) === personId,
    )
  }

  /**
   * Normalizes participant representations from the API and from in-flight drafts.
   */
  function resolveParticipantHandle(participant: CalendarParticipant) {
    if (typeof participant === 'number') {
      return participant
    }

    if (typeof participant === 'string') {
      const parsed = Number.parseInt(participant, 10)
      return Number.isNaN(parsed) ? null : parsed
    }

    return participant.handle ?? null
  }

  /**
   * Returns the weekday-specific work-hour entry for a local date string.
   */
  function getWorkHourForDate(date: string): WorkHourItem | null {
    if (!workHours.value) {
      return null
    }

    const day = parseLocalCalendarDate(date).getDay()
    switch (day) {
      case 0:
        return workHours.value.sunday as WorkHourItem
      case 1:
        return workHours.value.monday as WorkHourItem
      case 2:
        return workHours.value.tuesday as WorkHourItem
      case 3:
        return workHours.value.wednesday as WorkHourItem
      case 4:
        return workHours.value.thursday as WorkHourItem
      case 5:
        return workHours.value.friday as WorkHourItem
      case 6:
        return workHours.value.saturday as WorkHourItem
      default:
        return null
    }
  }

  /**
   * Converts any date-like value into the ISO/date/time fragments used by the edit dialog.
   */
  function getEventDateParts(value: number | string | Date): EventDateParts {
    const date = new Date(value)
    return {
      iso: isValidDate(date) ? date.toISOString() : '',
      date: isValidDate(date) ? formatLocalDate(date) : '',
      time: isValidDate(date) ? formatLocalTime(date) : '',
    }
  }

  /**
   * Checks whether a date instance represents a valid timestamp.
   */
  function isValidDate(date: Date) {
    return !Number.isNaN(date.getTime())
  }

  /**
   * Formats a date as yyyy-mm-dd in local time.
   */
  function formatLocalDate(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Formats a date as HH:mm in local time.
   */
  function formatLocalTime(date: Date) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  /**
   * Rounds a timestamp to the configured 15-minute grid.
   */
  function roundTime(time: number, down = true) {
    const roundTo = 15 * 60 * 1000
    if (down) {
      return time - (time % roundTo)
    }

    return time % roundTo === 0 ? time : time + (roundTo - (time % roundTo))
  }

  /**
   * Converts a calendar slot payload into a local timestamp.
   */
  function toTime(timeSlot: CalendarDateItem) {
    return new Date(
      timeSlot.year,
      timeSlot.month - 1,
      timeSlot.day,
      timeSlot.hour,
      timeSlot.minute,
    ).getTime()
  }

  /**
   * Resolves the persisted handle regardless of whether it lives on the root or nested event object.
   */
  function getCalendarEventHandle(event: CalendarEvent | null) {
    return event?.event?.handle ?? event?.handle ?? null
  }

  /**
   * Computes the ISO week number for the current header label.
   */
  function getWeekNumber(date: Date) {
    const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = normalized.getUTCDay() || 7
    normalized.setUTCDate(normalized.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1))
    return Math.ceil(((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }
  //#endregion

  //#region Return
  return {
    calendarScrollContainer,
    calendarDisplayType,
    calendarType,
    calendarTypeOptions: CALENDAR_TYPE_OPTIONS,
    calendarViewMode,
    calendarWeekdays,
    createEvent,
    currentMonthLabel,
    editEvent,
    entityEvent,
    events,
    getEventColor,
    getEvents,
    getEventsForPerson,
    getPersonName,
    getSideBySideEvents,
    getWorkHourStyle,
    goToNext,
    goToPrevious,
    goToToday,
    isLoading,
    isNarrowScreen,
    nowY,
    onEditDialogCancel,
    onEditDialogSave,
    onSelectedPeoplesUpdate,
    scrollToCurrentTime,
    selectedPeoples,
    showEditDialog,
    showWorkHourBackground,
    startDrag,
    startTime,
    extendBottom,
    mouseMove,
    endDrag,
    cancelDrag,
    templates,
    value,
    workHours,
  }
  //#endregion
}
