import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance, CSSProperties } from 'vue'
import ApiGenericService, {
  getGenericUpdateConflict,
  type FilterQuery,
  type GenericUpdateConflictDetails,
} from '@/services/api.generic.service'
import type {
  EntityItem,
  EventItem,
  HolidayItem,
  PersonItem,
  SaplingGenericItem,
  ScriptButtonItem,
  WorkHourWeekItem,
} from '@/entity/entity'
import type {
  AccumulatedPermission,
  DialogSaveAction,
  DialogSaveContext,
  DialogState,
  EntityTemplate,
} from '@/entity/structure'
import { DEFAULT_ENTITY_ITEMS_COUNT, NAVIGATION_URL } from '@/constants/project.constants'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiCalendarService, {
  type CalendarImportResult,
  type CalendarSyncProvider,
} from '@/services/api.calendar.service'
import ApiCurrentService from '@/services/api.current.service'
import ApiScriptService from '@/services/api.script.service'
import ApiTemplateService from '@/services/api.template.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'
import { useChangeLogDialogStore } from '@/stores/changeLogDialogStore'
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork'
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingChipFilters } from '@/composables/filter/useSaplingChipFilters'
import {
  getSaplingContextMenuTableItems,
  type SaplingContextMenuTableMenuEntry,
  type SaplingContextMenuTableMenuItem,
} from '@/composables/context/useSaplingContextMenuTable'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'
import { i18n } from '@/i18n'
import { formatDateFromTo, formatDateValue, formatTimeValue } from '@/utils/saplingFormatUtil'
import { expandRecurringEvent, isRecurringCalendarEvent } from '@/utils/eventRecurrence'
import { buildMailMenuActions } from '@/utils/saplingMailMenuUtil'
import { buildTableOrderBy } from '@/utils/saplingTableUtil'
import {
  buildScriptButtonExecutionKey,
  handleScriptResultClient,
  pushScriptButtonAlreadyRunningMessage,
  pushScriptButtonStartedMessage,
} from '@/utils/saplingScriptResultUtil'
import {
  formatLocalDate,
  getWeekNumber,
  isValidDate,
  normalizeDateForCalendarType,
  parseLocalCalendarDate,
  roundTime,
  toTime,
  type CalendarDateItem,
  type CalendarType,
} from '@/composables/event/eventDate.utils'
import {
  DEFAULT_EVENT_COLOR,
  DEFAULT_HOLIDAY_COLOR,
  applyCalendarEventDateParts,
  buildConcurrencyPayload,
  buildConcurrencyOptions,
  buildDraftEventPayload as buildDraftEventPayloadFromState,
  filterByCalendarMode as filterEventsByCalendarMode,
  filterWorkweekEvents as filterEventsByWorkweek,
  getCalendarEventAccentColor as resolveCalendarEventAccentColor,
  getCalendarInteractionForcedDirtyFields,
  getCalendarEventDescription,
  getCalendarEventHandle,
  getCalendarEventIcon,
  getCalendarEventTitle as resolveCalendarEventTitle,
  getItemHandle,
  getWorkHourForDate as resolveWorkHourForDate,
  hasParticipant,
  isReadonlyCalendarEvent,
  normalizeConcurrencyTimestamp,
  normalizeParticipantNames,
  resolveDraftParticipants,
  resolveHolidayGroupHandle,
  resolveParticipantHandle,
  resolvePersonHolidayGroupHandle,
  toCalendarEvent,
  toEditableEventItem,
  toHolidayCalendarEvent,
  toPersistedEventItem,
  type CalendarMode,
  type CalendarParticipant,
  type CalendarViewMode,
  type SaplingCalendarEvent,
} from '@/composables/event/eventCalendar.utils'

interface CalendarDatePair {
  start: CalendarDateItem
  end: CalendarDateItem
}

interface EventHeroStat {
  key: string
  label: string
  value: string
  icon: string
}

interface EventContextMenuState {
  visible: boolean
  item: EventItem | null
  x: number
  y: number
}

interface UpdateConflictDialogState {
  visible: boolean
  conflict: GenericUpdateConflictDetails | null
  draftItem: SaplingGenericItem | null
  action: DialogSaveAction
  isSaving: boolean
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
  isRecurring: boolean
  calendarEvent: CalendarEvent
}

export interface SelectedPersonPreviewItem {
  handle: number
  name: string
  isOwn: boolean
}

type CalendarScrollContainerRef = HTMLElement | ComponentPublicInstance | null
const CALENDAR_TYPE_OPTIONS: CalendarType[] = ['day', 'workweek', 'week', 'month']
const WORKWEEK_DAYS = [1, 2, 3, 4, 5]
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
    'filter',
    'holiday',
  )
  const currentPersonStore = useCurrentPersonStore()
  const currentPermissionStore = useCurrentPermissionStore()
  const timelineDialogStore = useTimelineDialogStore()
  const changeLogDialogStore = useChangeLogDialogStore()
  const { openMailDialog } = useSaplingMailDialog()
  const { pushMessage } = useSaplingMessageCenter()
  const windowWatcher = new SaplingWindowWatcher()
  const { peopleMap } = useSaplingFilterWork()

  const eventEntityHandle = ref('event')
  const ownPerson = ref<PersonItem | null>(null)
  const events = ref<SaplingCalendarEvent[]>([])
  const templates = ref<EntityTemplate[]>([])
  const {
    chipFilters,
    selectedChipFilters,
    selectedChipFilterCount,
    loadChipFilters,
    onSelectedChipFiltersUpdate,
    buildChipFilterClauses,
  } = useSaplingChipFilters({
    entityHandle: eventEntityHandle,
    entityTemplates: templates,
  })
  const selectedPeoples = ref<number[]>([])
  const calendarMode = ref<CalendarMode>('default')
  const calendarType = ref<CalendarType>(
    windowWatcher.getCurrentSize() === 'small' ? 'day' : 'workweek',
  )
  const calendarViewMode = ref<CalendarViewMode>('single')
  const isNarrowScreen = ref(windowWatcher.getCurrentSize() === 'small')
  const entityEvent = ref<EntityItem | null>(null)
  const editEvent = ref<CalendarEvent | null>(null)
  const updateConflictDialog = ref<UpdateConflictDialogState>({
    visible: false,
    conflict: null,
    draftItem: null,
    action: 'save',
    isSaving: false,
  })
  // Names of fields that should be marked dirty in the edit dialog after an
  // external interaction (e.g. drag/resize updated startDate/endDate before
  // the form was hydrated). The dialog highlights these fields exactly like
  // a manual edit and enables the save button.
  const forceEditDialogDirtyFields = ref<string[]>([])
  const calendarDateRange = ref<CalendarDatePair | null>(null)
  const showEditDialog = ref(false)
  const dragEvent = ref<CalendarEvent | null>(null)
  const dragTime = ref<number | null>(null)
  const createEvent = ref<CalendarEvent | null>(null)
  const createStart = ref<number | null>(null)
  const extendOriginal = ref<number | null>(null)
  // Tracks whether the most recently completed pointer interaction actually
  // moved/resized something. Used to swallow the synthetic `click` event the
  // browser dispatches after a same-cell drag, which would otherwise re-open
  // the dialog cleanly and overwrite the drag-induced dirty state.
  const suppressNextEventClick = ref(false)
  // Snapshot of the in-memory event before a drag/resize so a later "discard
  // changes" can roll the local calendar entry (and its nested event payload)
  // back to the pre-interaction state. Without this snapshot, the visual
  // position of the event is restored only after the next server refresh,
  // and re-opening the same record before that refresh would still show
  // the dragged times.
  const dragSnapshot = ref<{
    target: CalendarEvent
    start: number
    end: number
    event: CalendarEvent['event'] | undefined
  } | null>(null)
  const value = ref(formatLocalDate(new Date()))
  const calendarScrollContainer = ref<CalendarScrollContainerRef>(null)
  const workHours = ref<WorkHourWeekItem | null>(null)
  const eventContextMenu = ref<EventContextMenuState>({
    visible: false,
    item: null,
    x: 0,
    y: 0,
  })
  const showUploadDialog = ref(false)
  const uploadDialogItem = ref<SaplingGenericItem | null>(null)
  const showInformationDialog = ref(false)
  const informationDialogItem = ref<SaplingGenericItem | null>(null)
  const isSyncingExternalCalendar = ref(false)
  const loadedScriptButtons = ref<ScriptButtonItem[]>([])

  let stopWindowWatcher: (() => void) | null = null
  let scrollTimeoutId: number | null = null
  let scriptButtonsRequestId = 0
  const runningScriptButtonKeys = new Set<string>()

  const calendarDisplayType = computed(() =>
    calendarType.value === 'workweek' ? 'week' : calendarType.value,
  )
  const calendarWeekdays = computed(() =>
    calendarType.value === 'workweek' ? WORKWEEK_DAYS : undefined,
  )
  const isCalendarDragActive = computed(
    () => dragEvent.value != null || createEvent.value != null || extendOriginal.value != null,
  )
  const showWorkHourBackground = computed(() =>
    ['day', 'week', 'workweek'].includes(calendarType.value),
  )
  const eventEntityPermission = computed<AccumulatedPermission | null>(() => {
    if (!entityEvent.value?.handle) {
      return null
    }

    return {
      entityHandle: entityEvent.value.handle,
      allowRead: entityEvent.value.canRead === true,
      allowInsert: entityEvent.value.canInsert === true,
      allowUpdate: entityEvent.value.canUpdate === true,
      allowDelete: entityEvent.value.canDelete === true,
      allowShow: entityEvent.value.canShow === true,
    }
  })
  const canNavigate = computed(() =>
    templates.value.some((template) => template.options?.includes('isNavigation')),
  )
  const canShowInformation = computed(
    () =>
      currentPermissionStore.accumulatedPermission?.some(
        (permission) => permission.entityHandle === 'information' && permission.allowRead,
      ) ?? false,
  )
  const eventContextMenuStyle = computed<CSSProperties>(() => ({
    top: `${eventContextMenu.value.y}px`,
    left: `${eventContextMenu.value.x}px`,
  }))
  const eventContextMenuMailActions = computed(() =>
    buildMailMenuActions(templates.value, eventContextMenu.value.item),
  )
  const eventContextMenuItems = computed<SaplingContextMenuTableMenuEntry[]>(() => {
    if (!eventContextMenu.value.item) {
      return []
    }

    return getSaplingContextMenuTableItems({
      canChangeLog: true,
      canShowInformation: canShowInformation.value,
      entityPermission: eventEntityPermission.value,
      canNavigate: canNavigate.value,
      canTimeline: true,
      scriptButtons: loadedScriptButtons.value,
      mailActions: eventContextMenuMailActions.value,
      mailToLabel: i18n.global.t('global.mailTo'),
      showEdit: false,
    })
      .map((group) =>
        (Array.isArray(group) ? group : [group]).filter(
          (menuItem) => !['edit', 'show', 'delete'].includes(menuItem.type),
        ),
      )
      .filter((group) => group.length > 0)
  })
  const currentCalendarViewLabel = computed(() => i18n.global.t(`calendar.${calendarType.value}`))
  const currentCalendarLayoutLabel = computed(() =>
    i18n.global.t(
      calendarViewMode.value === 'single' ? 'calendar.combined' : 'calendar.sideBySide',
    ),
  )
  const calendarSyncProvider = computed<CalendarSyncProvider | null>(() => {
    const personType = ownPerson.value?.type ?? currentPersonStore.person?.type
    const typeHandle = typeof personType === 'string' ? personType : personType?.handle

    return typeHandle === 'azure' || typeHandle === 'google' ? typeHandle : null
  })

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
        const occurrenceKey =
          (event as CalendarEvent & { recurrenceOccurrenceStart?: string })
            .recurrenceOccurrenceStart ?? `${event.start}-${event.end}-${index}`

        return {
          key: String(getCalendarEventHandle(event) ?? 'event') + `-${occurrenceKey}`,
          title: resolveCalendarEventTitle(event, i18n.global.t('navigation.event')),
          dateLabel: sameDay
            ? formatDateValue(startDate)
            : `${formatDateValue(startDate)} - ${formatDateValue(endDate)}`,
          timeLabel: event.timed
            ? `${formatTimeValue(startDate)} - ${formatTimeValue(endDate)}`
            : '',
          description: getCalendarEventDescription(event),
          participantNames: getCalendarEventParticipants(event),
          icon: getCalendarEventIcon(event),
          accentColor: resolveCalendarEventAccentColor(event, getEventColor(event)),
          isOngoing: event.start <= now && event.end >= now,
          isRecurring: isRecurringCalendarEvent(event),
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
      currentPermissionStore.fetchCurrentPermission(),
      loadOwnPerson(),
      loadEventEntity(),
      loadEventScriptButtons(),
      loadTemplates(),
      loadWorkHours(),
    ])
    await loadChipFilters()

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

  watch(calendarMode, async () => {
    await refreshVisibleEvents()
  })

  watch(
    selectedChipFilters,
    async () => {
      await refreshVisibleEvents()
    },
    { deep: true },
  )
  //#endregion

  //#region Loading
  /**
   * Loads the signed-in person and initializes the default participant filter.
   */
  async function loadOwnPerson() {
    await currentPersonStore.fetchCurrentPerson()
    ownPerson.value = currentPersonStore.person

    if (typeof ownPerson.value?.handle === 'number') {
      peopleMap.value[ownPerson.value.handle] = ownPerson.value
    }

    selectedPeoples.value = ownPerson.value?.handle != null ? [ownPerson.value.handle] : []
  }

  /**
   * Loads the event templates used by the shared edit dialog.
   */
  async function loadTemplates() {
    templates.value = await ApiTemplateService.getEntityTemplate('event')
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
   * Loads script buttons for the event entity so the calendar context menu can mirror dialog actions.
   */
  async function loadEventScriptButtons() {
    const currentRequestId = ++scriptButtonsRequestId
    const result = await ApiGenericService.find<ScriptButtonItem>('scriptButton', {
      filter: { entity: { handle: 'event' } },
      orderBy: buildTableOrderBy([{ key: 'title', order: 'asc' }]),
      limit: DEFAULT_ENTITY_ITEMS_COUNT,
      relations: ['m:1'],
    })

    if (currentRequestId !== scriptButtonsRequestId) {
      return
    }

    loadedScriptButtons.value = result.data
  }

  /**
   * Loads the user's work week to render working-hour background blocks.
   */
  async function loadWorkHours() {
    workHours.value = await ApiCurrentService.getWorkWeek()
  }

  /**
   * Loads the currently selected people into the local lookup map used by event UI labels.
   */
  async function loadSelectedPeopleDetails() {
    const selectedHandles = Array.from(
      new Set(selectedPeoples.value.filter((handle) => Number.isInteger(handle))),
    )

    if (selectedHandles.length === 0) {
      return
    }

    const response = await ApiGenericService.find<PersonItem>('person', {
      filter: { handle: { $in: selectedHandles } },
      relations: ['company', 'holidayGroup', 'company.holidayGroup'],
      limit: selectedHandles.length,
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

  async function syncExternalCalendar() {
    if (
      !calendarDateRange.value ||
      isSyncingExternalCalendar.value ||
      !calendarSyncProvider.value
    ) {
      return
    }

    isSyncingExternalCalendar.value = true
    const provider = calendarSyncProvider.value

    const startDate = parseLocalCalendarDate(calendarDateRange.value.start.date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = parseLocalCalendarDate(calendarDateRange.value.end.date)
    endDate.setHours(23, 59, 59, 999)

    try {
      const result: CalendarImportResult = await ApiCalendarService.importEvents(provider, {
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
      })

      await refreshVisibleEvents()
      pushMessage(
        'success',
        i18n.global.t(
          provider === 'azure' ? 'calendar.syncOutlookSuccess' : 'calendar.syncGoogleSuccess',
        ),
        i18n.global.t('calendar.syncCalendarSuccessDescription', {
          imported: result.imported,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
        }),
        'calendar',
      )
    } catch {
      // Shared API handling already publishes the provider or validation error.
    } finally {
      isSyncingExternalCalendar.value = false
    }
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
   * Moves the calendar anchor to a specific date while keeping the current view aligned.
   */
  function goToDate(target: Date | string) {
    const parsedDate =
      typeof target === 'string' ? parseLocalCalendarDate(target) : new Date(target)
    if (!isValidDate(parsedDate)) {
      return
    }

    const nextValue = formatLocalDate(normalizeDateForCalendarType(parsedDate, calendarType.value))
    if (value.value === nextValue) {
      queueScrollToCurrentTime(0)
      return
    }

    value.value = nextValue
  }

  /**
   * Moves the calendar to today's date.
   */
  function goToToday() {
    goToDate(new Date())
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
    const current = normalizeDateForCalendarType(
      value.value ? parseLocalCalendarDate(value.value) : new Date(),
      calendarType.value,
    )
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

    value.value = formatLocalDate(normalizeDateForCalendarType(nextDate, calendarType.value))
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

    const weekDay = resolveWorkHourForDate(workHours.value, date)
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
    const holidayGroupHandles = getSelectedHolidayGroupHandles()
    const chipFilterClauses = buildChipFilterClauses()

    const [response, holidayResponse] = await Promise.all([
      ApiGenericService.find<EventItem>('event', {
        relations: ['participants', 'm:1'],
        filter: {
          $and: [
            { participants: selectedPeoples.value },
            ...chipFilterClauses,
            {
              $or: [
                {
                  $and: [
                    { startDate: { $lte: endDate.toISOString() } },
                    { endDate: { $gte: startDate.toISOString() } },
                  ],
                },
                {
                  $and: [{ recurrenceRule: { $ne: null } }, { recurrenceRule: { $ne: '' } }],
                },
              ],
            },
          ],
        },
      }),
      holidayGroupHandles.length > 0
        ? ApiGenericService.find<HolidayItem>('holiday', {
            relations: ['group'],
            filter: {
              $and: [
                { group: { $in: holidayGroupHandles } },
                { startDate: { $lte: endDate.toISOString() } },
                { endDate: { $gte: startDate.toISOString() } },
              ],
            },
          })
        : Promise.resolve({ data: [] as HolidayItem[] }),
    ])

    events.value = filterEventsByWorkweek(
      filterEventsByCalendarMode(
        [
          ...response.data.flatMap((event) =>
            expandRecurringEvent(event, startDate, endDate).map((calendarEvent) => ({
              ...calendarEvent,
              saplingSource: 'event' as const,
            })),
          ),
          ...holidayResponse.data.map((holiday) => toHolidayCalendarEvent(holiday)),
        ],
        calendarMode.value,
      ),
      calendarType.value,
    )
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
    if (!event || !timed || isReadonlyCalendarEvent(event)) {
      return
    }

    dragEvent.value = event
    dragTime.value = null
    extendOriginal.value = null
    captureDragSnapshot(event)
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
    if (isReadonlyCalendarEvent(event)) {
      return
    }

    createEvent.value = event
    createStart.value = event.start
    extendOriginal.value = event.end
    captureDragSnapshot(event)
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
   *
   * The handler must distinguish between three completely different
   * user gestures that all end with a `mouseup:time` event from Vuetify's
   * calendar:
   *
   *   1. A pure click on an existing event card. `startDrag` was called by
   *      Vuetify on mousedown but `mouseMove` never assigned `dragTime`, so
   *      nothing actually moved. We must not open a dirty edit dialog in
   *      this case — the card's own `@click` handler already invokes
   *      `openEventEditor` which opens the dialog clean.
   *   2. A drag/resize of an existing event. `dragTime`/`extendOriginal`
   *      will be set. The dialog must open with `forceDirty=true` so the
   *      save button is enabled even though the per-field snapshot already
   *      reflects the new dates.
   *   3. A click or drag on empty space creates a brand new draft via
   *      `startTime`. Its initial date values are the create baseline, so the
   *      dialog opens clean until the user actually changes a field.
   */
  function endDrag() {
    const isNewDraft =
      createEvent.value != null &&
      getCalendarEventHandle(createEvent.value) == null &&
      extendOriginal.value == null
    const wasDragged = dragEvent.value != null && dragTime.value != null
    const wasResized =
      extendOriginal.value != null &&
      createEvent.value != null &&
      createEvent.value.end !== extendOriginal.value

    if (isNewDraft) {
      editEvent.value = createEvent.value
      editEvent.value!.event = buildDraftEventPayloadFromState(
        createEvent.value!,
        ownPerson.value,
        selectedPeoples.value,
      )
      forceEditDialogDirtyFields.value = getCalendarInteractionForcedDirtyFields({
        isNewDraft,
        wasDragged,
        wasResized,
      })
      showEditDialog.value = true
      suppressNextEventClick.value = true
    } else if (wasDragged || wasResized) {
      editEvent.value = dragEvent.value ?? createEvent.value
      applyCalendarEventDateParts(editEvent.value)
      forceEditDialogDirtyFields.value = getCalendarInteractionForcedDirtyFields({
        isNewDraft,
        wasDragged,
        wasResized,
      })
      showEditDialog.value = editEvent.value != null
      suppressNextEventClick.value = true
    }
    // Else: pure click on an existing event. Leave dialog handling to the
    // explicit click handler that runs `openEventEditor` cleanly.

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
    if (!event || isReadonlyCalendarEvent(event)) {
      return
    }

    // Same-cell drags cause the browser to dispatch a synthetic `click` after
    // `mouseup`. `endDrag` already opened the dialog with the drag-induced
    // dirty state — swallow this stray click so we don't reset it here.
    if (suppressNextEventClick.value) {
      suppressNextEventClick.value = false
      return
    }

    editEvent.value =
      isRecurringCalendarEvent(event) && event.event
        ? toCalendarEvent(event.event as EventItem)
        : event
    applyCalendarEventDateParts(editEvent.value)
    forceEditDialogDirtyFields.value = []
    dragSnapshot.value = null
    showEditDialog.value = true
  }

  /**
   * Records the pre-interaction state of a calendar event before drag/resize
   * mutates its numeric start/end fields (and, in endDrag, its nested event
   * payload). Used to roll back local mutations when the user discards the
   * changes from the edit dialog.
   */
  function captureDragSnapshot(target: CalendarEvent) {
    dragSnapshot.value = {
      target,
      start: target.start,
      end: target.end,
      event: target.event,
    }
  }

  /**
   * Reverts the captured drag/resize snapshot on the original calendar entry.
   */
  function restoreDragSnapshot() {
    const snapshot = dragSnapshot.value
    if (!snapshot) {
      return
    }

    snapshot.target.start = snapshot.start
    snapshot.target.end = snapshot.end
    snapshot.target.event = snapshot.event
    dragSnapshot.value = null
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
    const fallbackColor = isReadonlyCalendarEvent(event)
      ? DEFAULT_HOLIDAY_COLOR
      : DEFAULT_EVENT_COLOR
    const color =
      typeof event.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(event.color)
        ? event.color
        : fallbackColor.toLowerCase()

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
  async function onEditDialogSave(
    updatedEvent: CalendarEvent,
    action: DialogSaveAction,
    context?: DialogSaveContext,
  ) {
    const eventPayload: CalendarEvent = { ...updatedEvent }
    const participantHandles = resolveDraftParticipants(updatedEvent, selectedPeoples.value)
    let savedEvent: EventItem
    let didSave = false

    try {
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
        savedEvent = await ApiGenericService.update<EventItem>(
          'event',
          editingHandle,
          eventPayload,
          {
            concurrency: buildConcurrencyOptions(
              templates.value,
              toEditableEventItem(editEvent.value),
            ),
            suppressConflictMessage: true,
          },
        )
        replaceLocalEvent(editEvent.value, updatedEvent, savedEvent)
      }

      didSave = true
      createEvent.value = null
      // Clear the drag-induced forced-dirty fields once the save succeeded so
      // that the dialog reflects the freshly persisted state (clean cancel,
      // disabled save buttons) instead of staying "dirty" forever.
      forceEditDialogDirtyFields.value = []
      dragSnapshot.value = null
      await refreshVisibleEvents()

      if (action === 'saveAndClose') {
        showEditDialog.value = false
        editEvent.value = null
        return
      }

      const persistedEvent = await loadPersistedEvent(savedEvent.handle)
      editEvent.value = toCalendarEvent(persistedEvent ?? savedEvent)
      showEditDialog.value = true
    } catch (error) {
      const conflict = getGenericUpdateConflict(error)
      if (conflict) {
        updateConflictDialog.value = {
          visible: true,
          conflict,
          draftItem: eventPayload as SaplingGenericItem,
          action,
          isSaving: false,
        }
      }
    } finally {
      context?.complete(didSave)
    }
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
    restoreDragSnapshot()
    showEditDialog.value = false
    editEvent.value = null
    forceEditDialogDirtyFields.value = []
    await refreshVisibleEvents()
  }

  function closeUpdateConflictDialog() {
    updateConflictDialog.value = {
      visible: false,
      conflict: null,
      draftItem: null,
      action: 'save',
      isSaving: false,
    }
  }

  function handleUpdateConflictVisibility(value: boolean): void {
    if (!value) {
      closeUpdateConflictDialog()
      return
    }

    updateConflictDialog.value = {
      ...updateConflictDialog.value,
      visible: true,
    }
  }

  function openUpdateConflictChangeLog() {
    const conflict = updateConflictDialog.value.conflict
    if (!conflict) {
      return
    }

    changeLogDialogStore.openChangeLog(conflict.entityHandle, String(conflict.handle))
  }

  async function reloadUpdateConflictRecord() {
    const conflict = updateConflictDialog.value.conflict
    const handle = getItemHandle(conflict?.current) ?? conflict?.handle
    if (typeof handle !== 'number') {
      closeUpdateConflictDialog()
      return
    }

    const currentItem = await loadPersistedEvent(handle)
    if (currentItem) {
      editEvent.value = toCalendarEvent(currentItem)
      applyCalendarEventDateParts(editEvent.value)
      forceEditDialogDirtyFields.value = []
      dragSnapshot.value = null
      showEditDialog.value = true
      await refreshVisibleEvents()
    }

    closeUpdateConflictDialog()
  }

  async function mergeUpdateConflict(mergedItem: SaplingGenericItem) {
    const conflictState = updateConflictDialog.value
    const conflict = conflictState.conflict
    if (!conflict || conflictState.isSaving) {
      return
    }

    const handle = getItemHandle(conflict.current) ?? conflict.handle
    if (handle == null) {
      return
    }

    updateConflictDialog.value = {
      ...conflictState,
      isSaving: true,
    }

    try {
      const savedEvent = await ApiGenericService.update<EventItem>('event', handle, mergedItem, {
        concurrency: {
          expectedUpdatedAt:
            conflict.currentUpdatedAt ?? normalizeConcurrencyTimestamp(conflict.current?.updatedAt),
          basePayload: buildConcurrencyPayload(templates.value, conflict.current ?? null),
          resolution: 'detect',
        },
        suppressConflictMessage: true,
      })

      replaceLocalEvent(editEvent.value, toCalendarEvent(savedEvent), savedEvent)
      createEvent.value = null
      forceEditDialogDirtyFields.value = []
      dragSnapshot.value = null
      await refreshVisibleEvents()

      closeUpdateConflictDialog()

      if (conflictState.action === 'saveAndClose') {
        showEditDialog.value = false
        editEvent.value = null
        return
      }

      const persistedEvent = await loadPersistedEvent(savedEvent.handle)
      editEvent.value = toCalendarEvent(persistedEvent ?? savedEvent)
      applyCalendarEventDateParts(editEvent.value)
      showEditDialog.value = true
    } catch (error) {
      const nextConflict = getGenericUpdateConflict(error)
      if (nextConflict) {
        updateConflictDialog.value = {
          ...conflictState,
          visible: true,
          conflict: nextConflict,
          draftItem: mergedItem,
          isSaving: false,
        }
        return
      }

      updateConflictDialog.value = {
        ...conflictState,
        isSaving: false,
      }
    }
  }

  function onEditDialogModeUpdate(mode: DialogState) {
    if (mode === 'create') {
      editEvent.value = null
    }
  }

  function onEditDialogItemUpdate(item: SaplingGenericItem | null) {
    editEvent.value = item ? toCalendarEvent(item as EventItem) : null
  }

  function closeEventContextMenu() {
    eventContextMenu.value.visible = false
  }

  function openEventContextMenu(mouseEvent: MouseEvent, calendarEvent: CalendarEvent) {
    const targetItem = toPersistedEventItem(calendarEvent)
    if (!targetItem) {
      return
    }

    eventContextMenu.value.visible = false
    eventContextMenu.value.item = targetItem
    eventContextMenu.value.x = mouseEvent.clientX
    eventContextMenu.value.y = mouseEvent.clientY

    void nextTick(() => {
      eventContextMenu.value.visible = true
    })
  }

  function closeUploadDialog() {
    showUploadDialog.value = false
    uploadDialogItem.value = null
  }

  function closeInformationDialog() {
    showInformationDialog.value = false
    informationDialogItem.value = null
  }

  function openCopyDialogFromContextMenu() {
    const item = eventContextMenu.value.item
    if (!item) {
      return
    }

    const copiedItem = { ...item } as Record<string, unknown>
    templates.value
      .filter((template) => template.name === 'handle' || template.isUnique)
      .forEach((template) => {
        delete copiedItem[template.name]
      })

    editEvent.value = toCalendarEvent(copiedItem as EventItem)
    applyCalendarEventDateParts(editEvent.value)
    forceEditDialogDirtyFields.value = []
    dragSnapshot.value = null
    showEditDialog.value = true
  }

  function openTimelineFromContextMenu() {
    const itemHandle = eventContextMenu.value.item?.handle
    if (itemHandle == null) {
      return
    }

    timelineDialogStore.openTimeline('event', itemHandle)
  }

  function openChangeLogFromContextMenu() {
    const itemHandle = eventContextMenu.value.item?.handle
    if (itemHandle == null) {
      return
    }

    changeLogDialogStore.openChangeLog('event', itemHandle)
  }

  function navigateToAddressFromContextMenu() {
    const item = eventContextMenu.value.item
    if (!item || !canNavigate.value) {
      return
    }

    const address = templates.value
      .filter((template) => template.options?.includes('isNavigation'))
      .map((template) => item[template.name || ''])
      .filter(Boolean)
      .join(' ')

    if (!address) {
      return
    }

    window.open(`${NAVIGATION_URL}${encodeURIComponent(address)}`, '_blank')
  }

  function openUploadDialogFromContextMenu() {
    if (!eventContextMenu.value.item || eventEntityPermission.value?.allowInsert !== true) {
      return
    }

    uploadDialogItem.value = eventContextMenu.value.item
    showUploadDialog.value = true
  }

  function navigateToDocumentsFromContextMenu() {
    const itemHandle = eventContextMenu.value.item?.handle
    if (itemHandle == null) {
      return
    }

    window.open(
      `/file/document?filter={"reference":"${String(itemHandle)}","entity":"event"}`,
      '_blank',
    )
  }

  function openInformationDialogFromContextMenu() {
    if (!eventContextMenu.value.item || !canShowInformation.value) {
      return
    }

    informationDialogItem.value = eventContextMenu.value.item
    showInformationDialog.value = true
  }

  async function runScriptButtonFromContextMenu(scriptButton: ScriptButtonItem) {
    if (!entityEvent.value || !eventContextMenu.value.item) {
      return
    }

    const executionKey = buildScriptButtonExecutionKey(scriptButton, [eventContextMenu.value.item])
    const scriptEntity = entityEvent.value.handle || 'event'
    if (runningScriptButtonKeys.has(executionKey)) {
      pushScriptButtonAlreadyRunningMessage({
        button: scriptButton,
        entity: scriptEntity,
        pushMessage,
        translate: i18n.global.t,
        hasTranslation: i18n.global.te,
      })
      return
    }

    runningScriptButtonKeys.add(executionKey)
    pushScriptButtonStartedMessage({
      button: scriptButton,
      entity: scriptEntity,
      itemCount: 1,
      pushMessage,
      translate: i18n.global.t,
      hasTranslation: i18n.global.te,
    })

    try {
      await currentPersonStore.fetchCurrentPerson()
      if (!currentPersonStore.person) {
        return
      }

      const result = await ApiScriptService.runClient(
        [eventContextMenu.value.item],
        entityEvent.value,
        currentPersonStore.person,
        scriptButton.name,
        scriptButton.parameter,
      )

      await handleScriptResultClient(result, {
        entity: scriptEntity,
        pushMessage,
      })

      if (result.isSuccess !== false) {
        await refreshVisibleEvents()
      }
    } catch {
      // API errors are already routed through the shared message center.
    } finally {
      runningScriptButtonKeys.delete(executionKey)
    }
  }

  async function handleEventContextMenuAction(menuItem: SaplingContextMenuTableMenuItem) {
    closeEventContextMenu()

    switch (menuItem.type) {
      case 'copy':
        openCopyDialogFromContextMenu()
        break
      case 'changeLog':
        openChangeLogFromContextMenu()
        break
      case 'timeline':
        openTimelineFromContextMenu()
        break
      case 'navigate':
        navigateToAddressFromContextMenu()
        break
      case 'uploadDocument':
        openUploadDialogFromContextMenu()
        break
      case 'showDocuments':
        navigateToDocumentsFromContextMenu()
        break
      case 'showInformation':
        openInformationDialogFromContextMenu()
        break
      case 'mail':
        if (menuItem.mailAction?.email) {
          openMailDialog({
            entityHandle: entityEvent.value?.handle ?? 'event',
            itemHandle: eventContextMenu.value.item?.handle ?? undefined,
            draftValues: eventContextMenu.value.item ?? undefined,
            initialTo: [menuItem.mailAction.email],
          })
        }
        break
      case 'script':
        if (menuItem.scriptButton) {
          await runScriptButtonFromContextMenu(menuItem.scriptButton)
        }
        break
      default:
        break
    }
  }

  /**
   * Returns only the events that belong to the requested person.
   */
  function getEventsForPerson(personId: number) {
    return events.value.filter((event) =>
      isReadonlyCalendarEvent(event)
        ? isHolidayVisibleForPerson(event, personId)
        : hasParticipant(event, personId),
    )
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
   * Resolves participant names for agenda cards while skipping read-only holidays.
   */
  function getCalendarEventParticipants(event: CalendarEvent) {
    if (isReadonlyCalendarEvent(event)) {
      return [] as string[]
    }

    return normalizeParticipantNames(event.event?.participants, resolveParticipantName)
  }

  /**
   * Replaces a local calendar entry with the saved backend result.
   */
  function replaceLocalEvent(
    targetEvent: CalendarEvent | null,
    baseEvent: CalendarEvent,
    savedEvent: EventItem,
  ) {
    if (!targetEvent || savedEvent.recurrenceRule || isRecurringCalendarEvent(targetEvent)) {
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
   * Returns the loaded person record for a calendar column, preferring the signed-in user instance.
   */
  function getCalendarPerson(personId: number) {
    if (ownPerson.value?.handle === personId) {
      return ownPerson.value
    }

    return peopleMap.value[personId] ?? null
  }

  /**
   * Collects the distinct holiday groups that are currently active in the calendar selection.
   */
  function getSelectedHolidayGroupHandles() {
    return Array.from(
      new Set(
        selectedPeoples.value
          .map((personId) => resolvePersonHolidayGroupHandle(getCalendarPerson(personId)))
          .filter((handle): handle is number => handle != null),
      ),
    )
  }

  /**
   * Checks whether a holiday belongs to the effective holiday group of the requested person.
   */
  function isHolidayVisibleForPerson(event: CalendarEvent, personId: number) {
    const personHolidayGroupHandle = resolvePersonHolidayGroupHandle(getCalendarPerson(personId))
    if (personHolidayGroupHandle == null) {
      return false
    }

    return (
      resolveHolidayGroupHandle((event.event as HolidayItem | undefined)?.group) ===
      personHolidayGroupHandle
    )
  }

  //#endregion

  //#region Return
  return {
    forceEditDialogDirtyFields,
    calendarScrollContainer,
    calendarDisplayType,
    calendarType,
    calendarTypeOptions: CALENDAR_TYPE_OPTIONS,
    calendarViewMode,
    calendarMode,
    calendarSyncProvider,
    calendarWeekdays,
    createEvent,
    currentCalendarLayoutLabel,
    currentDateRangeLabel,
    currentCalendarViewLabel,
    currentMonthLabel,
    eventContextMenu,
    eventContextMenuItems,
    eventContextMenuStyle,
    editEvent,
    entityEvent,
    chipFilters,
    updateConflictDialog,
    events,
    eventContextMenuMailActions,
    eventEntityPermission,
    canNavigate,
    canShowInformation,
    getEventColor,
    getEvents,
    getEventsForPerson,
    getPersonName,
    getSideBySideEvents,
    getWorkHourStyle,
    goToDate,
    goToNext,
    goToPrevious,
    goToToday,
    isCalendarDragActive,
    isLoading,
    isSyncingExternalCalendar,
    isNarrowScreen,
    nowY,
    openEventContextMenu,
    onEditDialogCancel,
    closeUpdateConflictDialog,
    handleUpdateConflictVisibility,
    handleEventContextMenuAction,
    mergeUpdateConflict,
    onEditDialogItemUpdate,
    onEditDialogModeUpdate,
    onEditDialogSave,
    openUpdateConflictChangeLog,
    openEventEditor,
    onSelectedChipFiltersUpdate,
    onSelectedPeoplesUpdate,
    reloadUpdateConflictRecord,
    scrollToCurrentTime,
    selectedPeoples,
    selectedChipFilters,
    selectedChipFilterCount,
    selectedPeopleOverflowCount,
    selectedPeoplePreview,
    syncExternalCalendar,
    closeEventContextMenu,
    closeInformationDialog,
    closeUploadDialog,
    showEditDialog,
    showInformationDialog,
    showWorkHourBackground,
    showUploadDialog,
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
    informationDialogItem,
    uploadDialogItem,
    upcomingEvents,
    value,
    workHours,
  }
  //#endregion
}
