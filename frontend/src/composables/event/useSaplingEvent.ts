import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance, CSSProperties } from 'vue'
import ApiGenericService from '@/services/api.generic.service'
import type {
  CompanyItem,
  EntityItem,
  EventItem,
  PersonItem,
  SaplingGenericItem,
  WorkHourItem,
  WorkHourWeekItem,
} from '@/entity/entity'
import type { DialogSaveAction, DialogState, EntityTemplate } from '@/entity/structure'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiService from '@/services/api.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'
import { i18n } from '@/i18n'
import { formatDateFromTo, formatDateValue, formatTimeValue } from '@/utils/saplingFormatUtil'

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

interface EventHeroStat {
  key: string
  label: string
  value: string
  icon: string
}

export interface EventAgendaItem {
  key: string
  title: string
  dateLabel: string
  timeLabel: string
  description: string
  participantNames: string[]
  icon: string
  accentColor: string
  isOngoing: boolean
  calendarEvent: CalendarEvent
}

export interface SelectedPersonPreviewItem {
  handle: number
  name: string
  isOwn: boolean
}

type CalendarType = 'workweek' | 'month' | 'day' | 'week'
type CalendarViewMode = 'single' | 'sidebyside'
type CalendarParticipant = PersonItem | number | string
type CalendarScrollContainerRef = HTMLElement | ComponentPublicInstance | null
type EditableEventPayload = Omit<
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
  // Force the edit dialog to be dirty (z.B. nach Drag&Drop)
  const forceEditDialogDirty = ref(false)
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
  const currentCalendarViewLabel = computed(() => i18n.global.t(`calendar.${calendarType.value}`))
  const currentCalendarLayoutLabel = computed(() =>
    i18n.global.t(
      calendarViewMode.value === 'single' ? 'calendar.combined' : 'calendar.sideBySide',
    ),
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

  const currentDateRangeLabel = computed(() => {
    if (calendarDateRange.value?.start?.date && calendarDateRange.value?.end?.date) {
      return formatDateFromTo(calendarDateRange.value.start.date, calendarDateRange.value.end.date)
    }

    return formatDateValue(parseLocalCalendarDate(value.value))
  })

  const sortedVisibleEvents = computed(() =>
    [...events.value].sort((left, right) => Number(left.start) - Number(right.start)),
  )

  const todayEventsCount = computed(() => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    ).getTime()

    return events.value.filter((event) => event.start <= endOfDay && event.end >= startOfDay).length
  })

  const selectedPeoplePreview = computed<SelectedPersonPreviewItem[]>(() =>
    selectedPeoples.value.slice(0, 6).map((personId) => ({
      handle: personId,
      name: getPersonName(personId),
      isOwn: ownPerson.value?.handle === personId,
    })),
  )

  const selectedPeopleOverflowCount = computed(() =>
    Math.max(selectedPeoples.value.length - selectedPeoplePreview.value.length, 0),
  )

  const upcomingEvents = computed<EventAgendaItem[]>(() => {
    const now = Date.now()
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    ).getTime()

    return sortedVisibleEvents.value
      .filter((event) => event.start <= endOfDay && event.end >= startOfDay)
      .map((event, index) => {
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)
        const sameDay = formatLocalDate(startDate) === formatLocalDate(endDate)

        return {
          key: String(getCalendarEventHandle(event) ?? `${event.start}-${event.end}-${index}`),
          title: event.event?.title || event.name || i18n.global.t('navigation.event'),
          dateLabel: sameDay
            ? formatDateValue(startDate)
            : `${formatDateValue(startDate)} - ${formatDateValue(endDate)}`,
          timeLabel: event.timed
            ? `${formatTimeValue(startDate)} - ${formatTimeValue(endDate)}`
            : '',
          description: event.event?.description || '',
          participantNames: normalizeParticipantNames(event.event?.participants),
          icon: event.event?.type?.icon || 'mdi-calendar-clock-outline',
          accentColor: event.event?.status?.color || getEventColor(event),
          isOngoing: event.start <= now && event.end >= now,
          calendarEvent: event,
        }
      })
  })

  const heroStats = computed<EventHeroStat[]>(() => [
    {
      key: 'visible-events',
      label: i18n.global.t('navigation.event'),
      value: String(events.value.length),
      icon: 'mdi-calendar-clock-outline',
    },
    {
      key: 'today-events',
      label: i18n.global.t('event.today'),
      value: String(todayEventsCount.value),
      icon: 'mdi-calendar-today',
    },
    {
      key: 'selected-people',
      label: i18n.global.t('navigation.person'),
      value: String(selectedPeoples.value.length),
      icon: 'mdi-account-group-outline',
    },
  ])

  const sideBySideGridStyle = computed<CSSProperties>(() => {
    const selectedCount = selectedPeoples.value.length

    if (selectedCount <= 2) {
      return {
        gridTemplateColumns: `repeat(${Math.max(selectedCount, 1)}, minmax(0, 1fr))`,
      }
    }

    return {
      gridTemplateColumns: `repeat(${selectedCount}, minmax(420px, 1fr))`,
    }
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
      await loadSelectedPeopleDetails()
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
   * Loads the currently selected people into the local lookup map used by event UI labels.
   */
  async function loadSelectedPeopleDetails() {
    const missingHandles = Array.from(
      new Set(
        selectedPeoples.value.filter(
          (handle) => Number.isInteger(handle) && !peopleMap.value[handle],
        ),
      ),
    )

    if (missingHandles.length === 0) {
      return
    }

    const response = await ApiGenericService.find<PersonItem>('person', {
      filter: { handle: { $in: missingHandles } },
      limit: missingHandles.length,
    })

    response.data.forEach((person) => {
      if (typeof person.handle === 'number') {
        peopleMap.value[person.handle] = person
      }
    })
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

    const containers = Array.from(
      outer.querySelectorAll(
        '.v-calendar-daily__scroll-area, .v-calendar-weekly__scroll-area, .v-calendar-monthly__scroll-area',
      ),
    ) as HTMLElement[]

    const resolvedContainers = containers.length > 0 ? containers : [outer]
    let hasMarkers = false

    resolvedContainers.forEach((container) => {
      const markers = Array.from(container.querySelectorAll('.v-current-time')) as HTMLElement[]
      if (markers.length === 0 || container.scrollHeight <= container.clientHeight) {
        return
      }

      hasMarkers = true
      const targetOffset = resolveCurrentTimeScrollOffset(container, markers)
      if (targetOffset == null) {
        return
      }

      container.style.scrollBehavior = 'smooth'
      container.scrollTo({ top: targetOffset })
    })

    if (!hasMarkers) {
      queueScrollToCurrentTime(200)
      return
    }

    window.setTimeout(() => {
      resolvedContainers.forEach((container) => {
        container.style.scrollBehavior = ''
      })
    }, 500)
  }

  /**
   * Resolves the scroll target that centers the current-time marker inside a calendar scroller.
   */
  function resolveCurrentTimeScrollOffset(container: HTMLElement, markers: HTMLElement[]) {
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
    if (!resolvedMarker) {
      return null
    }

    const markerRect = resolvedMarker.getBoundingClientRect()
    return (
      markerRect.top -
      containerRect.top +
      container.scrollTop -
      containerRect.height / 2 +
      markerRect.height / 2
    )
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
      event: {
        participants: [...selectedPeoples.value],
      },
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
    // Wenn ein Event verschoben, erstellt oder in der Zeit verändert wurde, Dialog dirty öffnen
    if (createEvent.value && getCalendarEventHandle(createEvent.value) == null) {
      editEvent.value = createEvent.value
      editEvent.value.event = buildDraftEventPayload(createEvent.value)
      forceEditDialogDirty.value = true
      showEditDialog.value = true
    } else {
      editEvent.value = dragEvent.value ?? createEvent.value
      applyCalendarEventDateParts(editEvent.value)
      // Dialog dirty, wenn Drag oder Resize (extendOriginal) aktiv war
      forceEditDialogDirty.value = !!dragEvent.value || extendOriginal.value != null
      showEditDialog.value = editEvent.value != null
    }

    dragTime.value = null
    dragEvent.value = null
    createEvent.value = null
    createStart.value = null
    extendOriginal.value = null
  }

  /**
   * Opens an existing event directly in the shared edit dialog.
   */
  function openEventEditor(event: CalendarEvent) {
    if (!event) {
      return
    }

    editEvent.value = event
    applyCalendarEventDateParts(editEvent.value)
    forceEditDialogDirty.value = false
    showEditDialog.value = true
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
  async function onEditDialogSave(updatedEvent: CalendarEvent, action: DialogSaveAction) {
    const eventPayload: CalendarEvent = { ...updatedEvent }
    const participantHandles = resolveDraftParticipants(updatedEvent)
    let savedEvent: EventItem

    if (getCalendarEventHandle(eventPayload) == null) {
      eventPayload.participants = participantHandles
    }

    applyCalendarEventDateParts(eventPayload)

    const editingHandle = getCalendarEventHandle(editEvent.value)
    if (editingHandle == null) {
      savedEvent = await ApiGenericService.create<EventItem>('event', eventPayload)
      await createEventParticipants(savedEvent.handle, participantHandles)
      replaceLocalEvent(editEvent.value, eventPayload, savedEvent)
    } else {
      savedEvent = await ApiGenericService.update<EventItem>('event', editingHandle, eventPayload)
      replaceLocalEvent(editEvent.value, updatedEvent, savedEvent)
    }

    createEvent.value = null
    await refreshVisibleEvents()

    if (action === 'saveAndClose') {
      showEditDialog.value = false
      editEvent.value = null
      return
    }

    const persistedEvent = await loadPersistedEvent(savedEvent.handle)
    editEvent.value = toCalendarEvent(persistedEvent ?? savedEvent)
    showEditDialog.value = true
  }

  /**
   * Persists selected people as event participants after the base event record has been created.
   */
  async function createEventParticipants(
    eventHandle: string | number | null | undefined,
    participants: number[],
  ) {
    if (eventHandle == null || participants.length === 0) {
      return
    }

    for (const participantHandle of participants) {
      await ApiGenericService.createReference(
        'event',
        'participants',
        eventHandle,
        participantHandle,
      )
    }
  }

  /**
   * Restores the calendar state after the edit dialog is dismissed.
   */
  async function onEditDialogCancel() {
    showEditDialog.value = false
    editEvent.value = null
    forceEditDialogDirty.value = false
    await refreshVisibleEvents()
  }

  function onEditDialogModeUpdate(mode: DialogState) {
    if (mode === 'create') {
      editEvent.value = null
    }
  }

  function onEditDialogItemUpdate(item: SaplingGenericItem | null) {
    editEvent.value = item ? toCalendarEvent(item as EventItem) : null
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
      return (
        person.displayName ||
        fullName ||
        person.name ||
        person.email ||
        `${i18n.global.t('global.person')} ${personId}`
      )
    }

    if (ownPerson.value?.handle === personId) {
      const ownName = ownPerson.value.displayName || ownPerson.value.name || ownPerson.value.email
      return ownName || `${i18n.global.t('global.person')} ${personId}`
    }

    return `${i18n.global.t('global.person')} ${personId}`
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
    const participants = resolveDraftParticipants(event)

    return {
      title: event.name,
      startDate: startDateParts.iso,
      endDate: endDateParts.iso,
      creatorPerson: ownPerson.value ?? undefined,
      creatorCompany: ownPerson.value?.company ?? undefined,
      assigneePerson: ownPerson.value ?? undefined,
      assigneeCompany: ownPerson.value?.company ?? undefined,
      participants,
      startDate_date: startDateParts.date,
      startDate_time: startDateParts.time,
      endDate_date: endDateParts.date,
      endDate_time: endDateParts.time,
    }
  }

  /**
   * Uses dialog-provided participants when available and otherwise falls back to the current filter selection.
   */
  function resolveDraftParticipants(event: CalendarEvent) {
    const explicitParticipants = normalizeParticipantHandles(event.participants)
    if (explicitParticipants.length > 0) {
      return explicitParticipants
    }

    const nestedParticipants = normalizeParticipantHandles(event.event?.participants)
    if (nestedParticipants.length > 0) {
      return nestedParticipants
    }

    return [...selectedPeoples.value]
  }

  /**
   * Normalizes participants from relation objects, numeric ids, or strings to stable person handles.
   */
  function normalizeParticipantHandles(participants: unknown) {
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

  /**
   * Resolves stable participant display names for agenda cards.
   */
  function normalizeParticipantNames(participants: unknown) {
    if (!Array.isArray(participants)) {
      return [] as string[]
    }

    const seen = new Set<string>()

    return participants.reduce<string[]>((names, participant) => {
      const handle = resolveParticipantHandle(participant as CalendarParticipant)
      const name = resolveParticipantName(participant as CalendarParticipant)
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

  async function loadPersistedEvent(handle: EventItem['handle']) {
    if (handle == null) {
      return null
    }

    const result = await ApiGenericService.find<EventItem>('event', {
      filter: { handle },
      limit: 1,
      relations: ['m:1'],
    })

    return result.data[0] ?? null
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
   * Resolves a readable participant name from relation objects or fallback ids.
   */
  function resolveParticipantName(participant: CalendarParticipant) {
    if (typeof participant === 'number') {
      return getPersonName(participant)
    }

    if (typeof participant === 'string') {
      const parsed = Number.parseInt(participant, 10)
      return Number.isNaN(parsed) ? participant.trim() || null : getPersonName(parsed)
    }

    const fullName = [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim()
    return (
      participant.displayName ||
      fullName ||
      participant.name ||
      participant.email ||
      (participant.handle != null ? getPersonName(participant.handle) : null)
    )
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
    forceEditDialogDirty,
    calendarScrollContainer,
    calendarDisplayType,
    calendarType,
    calendarTypeOptions: CALENDAR_TYPE_OPTIONS,
    calendarViewMode,
    calendarWeekdays,
    createEvent,
    currentCalendarLayoutLabel,
    currentDateRangeLabel,
    currentCalendarViewLabel,
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
    onEditDialogItemUpdate,
    onEditDialogModeUpdate,
    onEditDialogSave,
    openEventEditor,
    onSelectedPeoplesUpdate,
    scrollToCurrentTime,
    selectedPeoples,
    selectedPeopleOverflowCount,
    selectedPeoplePreview,
    showEditDialog,
    showWorkHourBackground,
    sideBySideGridStyle,
    startDrag,
    startTime,
    extendBottom,
    mouseMove,
    endDrag,
    cancelDrag,
    heroStats,
    templates,
    todayEventsCount,
    upcomingEvents,
    value,
    workHours,
  }
  //#endregion
}
