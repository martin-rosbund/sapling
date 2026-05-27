import { computed, ref } from 'vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { useI18n } from 'vue-i18n'
import type {
  EffortEstimateItem,
  EventItem,
  InboxNotificationItem,
  SalesOpportunityItem,
  TicketItem,
} from '@/entity/entity'
import ApiService from '@/services/api.service'
import { formatDate, formatDateFromTo, formatDateTimeValue } from '@/utils/saplingFormatUtil'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import {
  getEffortEstimateInboxRoute,
  getNotificationInboxRoute,
  getSalesOpportunityInboxRoute,
  getTaskInboxRoute,
  getTicketInboxRoute,
} from '@/utils/inboxRoute.util'
import {
  useOpenTaskCountEvents,
  updateOpenTaskSnapshot,
  type OpenTaskSnapshot,
} from '@/composables/system/useOpenTaskCountEvents'

type CloseEmitter = (event: 'close') => void
export type InboxEntryKind =
  | 'ticket'
  | 'event'
  | 'salesOpportunity'
  | 'effortEstimate'
  | 'notification'
export type InboxSectionKey = 'overdue' | 'today' | 'upcoming' | 'later' | 'unplanned'

const UPCOMING_DAY_RANGE = 7

export interface InboxEntry {
  id: string
  kind: InboxEntryKind
  kindLabelKey:
    | 'navigation.ticket'
    | 'navigation.event'
    | 'navigation.salesOpportunity'
    | 'navigation.effortEstimate'
    | 'navigation.inboxNotification'
  title: string
  description: string
  dateText: string
  dateValue: Date | null
  icon: string
  accentColor?: string | null
  contextLabel?: string
  contextColor?: string | null
  statusLabel?: string
  statusColor?: string | null
  supportLabels: string[]
  route: RouteLocationRaw
  notificationHandle?: number | null
  dismissible?: boolean
}

export interface InboxSection {
  key: InboxSectionKey
  titleKey: 'inbox.overdue' | 'inbox.today' | 'inbox.upcoming' | 'inbox.later' | 'inbox.unplanned'
  subtitleKey:
    | 'inbox.overdueSummary'
    | 'inbox.todaySummary'
    | 'inbox.upcomingSummary'
    | 'inbox.laterSummary'
    | 'inbox.unplannedSummary'
  emptyKey:
    | 'inbox.overdueEmpty'
    | 'inbox.todayEmpty'
    | 'inbox.upcomingEmpty'
    | 'inbox.laterEmpty'
    | 'inbox.unplannedEmpty'
  icon: string
  tone: 'primary' | 'info' | 'warning' | 'success' | 'secondary'
  count: number
  items: InboxEntry[]
  empty: boolean
}

export interface InboxSummaryCard {
  key: 'total' | 'overdue' | 'today' | 'upcoming' | 'later'
  labelKey:
    | 'navigation.inbox'
    | 'inbox.overdue'
    | 'inbox.today'
    | 'inbox.upcoming'
    | 'inbox.later'
  icon: string
  count: number
  tone: 'primary' | 'warning' | 'info' | 'success'
}

export function useSaplingInbox(emit: CloseEmitter) {
  //#region State
  const { t } = useI18n()
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'inbox', 'navigation')
  const dialog = ref(true)
  const isDataLoading = ref(true)
  const tickets = ref<TicketItem[]>([])
  const tasks = ref<EventItem[]>([])
  const salesOpportunities = ref<SalesOpportunityItem[]>([])
  const effortEstimates = ref<EffortEstimateItem[]>([])
  const notifications = ref<InboxNotificationItem[]>([])
  const router = useRouter()
  const isLoading = computed(() => isTranslationLoading.value || isDataLoading.value)
  //#endregion

  useOpenTaskCountEvents((snapshot) => {
    applyOpenTaskSnapshot(snapshot)
  })

  //#region Utility Functions
  function toDate(date: Date | string | null | undefined): Date | null {
    if (!date) {
      return null
    }

    const normalizedDate = typeof date === 'string' ? new Date(date) : date
    return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate
  }

  function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  function addDays(date: Date, days: number) {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + days)
    return nextDate
  }

  function getSectionKey(date: Date | null): InboxSectionKey {
    if (!date) {
      return 'unplanned'
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const tomorrowStart = addDays(todayStart, 1)
    const upcomingEnd = addDays(tomorrowStart, UPCOMING_DAY_RANGE)

    if (date < todayStart) {
      return 'overdue'
    }

    if (date < tomorrowStart) {
      return 'today'
    }

    if (date < upcomingEnd) {
      return 'upcoming'
    }

    return 'later'
  }

  function compareEntriesByDate(left: InboxEntry, right: InboxEntry) {
    const leftTime = left.dateValue?.getTime() ?? Number.MAX_SAFE_INTEGER
    const rightTime = right.dateValue?.getTime() ?? Number.MAX_SAFE_INTEGER

    if (leftTime !== rightTime) {
      return leftTime - rightTime
    }

    return left.title.localeCompare(right.title)
  }

  function formatCurrency(value?: number | null) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return ''
    }

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  function formatProbability(value?: number | null) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return ''
    }

    return `${Math.round(value)}%`
  }

  function openEntry(entry: InboxEntry) {
    closeDialog()
    void router.push(entry.route)
  }

  function applyOpenTaskSnapshot(snapshot: OpenTaskSnapshot) {
    tickets.value = snapshot.tickets
    tasks.value = snapshot.tasks
    salesOpportunities.value = snapshot.salesOpportunities
    effortEstimates.value = snapshot.effortEstimates ?? []
    notifications.value = snapshot.notifications
    isDataLoading.value = false
  }

  function publishOpenTaskSnapshot() {
    updateOpenTaskSnapshot({
      count:
        tickets.value.length +
        tasks.value.length +
        salesOpportunities.value.length +
        effortEstimates.value.length +
        notifications.value.length,
      tickets: [...tickets.value],
      tasks: [...tasks.value],
      salesOpportunities: [...salesOpportunities.value],
      effortEstimates: [...effortEstimates.value],
      notifications: [...notifications.value],
    })
  }

  function createTicketEntry(ticket: TicketItem): InboxEntry {
    const dateValue = toDate(ticket.deadlineDate)

    return {
      id: `ticket-${ticket.handle ?? ticket.title}`,
      kind: 'ticket',
      kindLabelKey: 'navigation.ticket',
      title: ticket.title,
      description: ticket.problemDescription ?? '',
      dateText: formatDate(ticket.deadlineDate),
      dateValue,
      icon: 'mdi-ticket-confirmation-outline',
      accentColor: ticket.priority?.color ?? ticket.status?.color,
      contextLabel: ticket.priority?.description,
      contextColor: ticket.priority?.color,
      statusLabel: ticket.status?.description,
      statusColor: ticket.status?.color,
      supportLabels: [],
      route: getTicketInboxRoute(ticket),
    }
  }

  function createTaskEntry(task: EventItem): InboxEntry {
    const dateValue = toDate(task.startDate)

    return {
      id: `event-${task.handle ?? task.title}`,
      kind: 'event',
      kindLabelKey: 'navigation.event',
      title: task.title,
      description: task.description ?? '',
      dateText: formatDateFromTo(task.startDate, task.endDate),
      dateValue,
      icon: task.type?.icon || 'mdi-calendar-clock-outline',
      accentColor: task.type?.color ?? task.status?.color,
      contextLabel: task.type?.title,
      contextColor: task.type?.color,
      statusLabel: task.status?.description,
      statusColor: task.status?.color,
      supportLabels: [],
      route: getTaskInboxRoute(task),
    }
  }

  function createSalesOpportunityEntry(opportunity: SalesOpportunityItem): InboxEntry {
    const dateValue = toDate(opportunity.closeDate)
    const supportLabels = [
      formatCurrency(opportunity.expectedRevenue),
      formatProbability(opportunity.probability),
      opportunity.creatorCompany?.name ?? '',
    ].filter((label) => label.length > 0)

    return {
      id: `sales-opportunity-${opportunity.handle ?? opportunity.title}`,
      kind: 'salesOpportunity',
      kindLabelKey: 'navigation.salesOpportunity',
      title: opportunity.title,
      description: opportunity.nextStep ?? opportunity.description ?? opportunity.painPoints ?? '',
      dateText: formatDate(opportunity.closeDate),
      dateValue,
      icon: opportunity.type?.icon || 'mdi-chart-timeline-variant',
      accentColor: opportunity.type?.color ?? opportunity.forecast?.color,
      contextLabel: opportunity.forecast?.title,
      contextColor: opportunity.forecast?.color,
      statusLabel: opportunity.type?.title,
      statusColor: opportunity.type?.color,
      supportLabels,
      route: getSalesOpportunityInboxRoute(opportunity),
    }
  }

  function createEffortEstimateEntry(estimate: EffortEstimateItem): InboxEntry {
    const dateValue = toDate(estimate.expectedCompletionDate)
    const status = typeof estimate.status === 'object' ? estimate.status : null
    const supportLabels = [
      estimate.creatorCompany?.name ?? '',
      estimate.creatorPerson
        ? `${estimate.creatorPerson.firstName ?? ''} ${estimate.creatorPerson.lastName ?? ''}`.trim()
        : '',
      estimate.ticket?.title ?? '',
    ].filter((label) => label.length > 0)

    return {
      id: `effort-estimate-${estimate.handle ?? estimate.title}`,
      kind: 'effortEstimate',
      kindLabelKey: 'navigation.effortEstimate',
      title: estimate.title,
      description: estimate.requirementsMarkdown ?? '',
      dateText: formatDate(estimate.expectedCompletionDate),
      dateValue,
      icon: 'mdi-clipboard-text-clock-outline',
      accentColor: status?.color,
      contextLabel: estimate.salesOpportunity?.title,
      contextColor: 'success',
      statusLabel: status?.description,
      statusColor: status?.color,
      supportLabels,
      route: getEffortEstimateInboxRoute(estimate),
    }
  }

  function createNotificationEntry(notification: InboxNotificationItem): InboxEntry {
    const dateValue = toDate(notification.createdAt)
    const entityHandle =
      typeof notification.entity === 'object'
        ? String(notification.entity.handle ?? '').trim()
        : String(notification.entity ?? '').trim()
    const entityTranslationKey = entityHandle ? `navigation.${entityHandle}` : ''
    const entityLabel =
      entityTranslationKey && t(entityTranslationKey) !== entityTranslationKey
        ? t(entityTranslationKey)
        : entityHandle

    return {
      id: `notification-${notification.handle ?? notification.title}`,
      kind: 'notification',
      kindLabelKey: 'navigation.inboxNotification',
      title: notification.title,
      description: notification.bodyText ?? '',
      dateText: notification.createdAt ? formatDateTimeValue(notification.createdAt) : '',
      dateValue,
      icon:
        typeof notification.entity === 'object'
          ? (notification.entity.icon ?? 'mdi-bell-outline')
          : 'mdi-bell-outline',
      accentColor: null,
      contextLabel: notification.referenceHandle ? `#${notification.referenceHandle}` : undefined,
      contextColor: 'primary',
      statusLabel: entityLabel || undefined,
      statusColor: 'primary',
      supportLabels: [],
      route: getNotificationInboxRoute(notification),
      notificationHandle: notification.handle ?? null,
      dismissible: true,
    }
  }

  async function dismissEntry(entry: InboxEntry) {
    if (entry.notificationHandle == null) {
      return
    }

    await ApiService.post(`current/inboxNotification/${entry.notificationHandle}/read`)
    notifications.value = notifications.value.filter(
      (notification) => notification.handle !== entry.notificationHandle,
    )
    publishOpenTaskSnapshot()
  }
  //#endregion

  //#region Derived State
  const ticketEntries = computed(() => tickets.value.map(createTicketEntry))
  const taskEntries = computed(() => tasks.value.map(createTaskEntry))
  const salesOpportunityEntries = computed(() =>
    salesOpportunities.value.map(createSalesOpportunityEntry),
  )
  const effortEstimateEntries = computed(() => effortEstimates.value.map(createEffortEstimateEntry))
  const notificationEntries = computed(() => notifications.value.map(createNotificationEntry))
  const actionableEntries = computed(() =>
    [
      ...ticketEntries.value,
      ...taskEntries.value,
      ...salesOpportunityEntries.value,
      ...effortEstimateEntries.value,
    ].sort(compareEntriesByDate),
  )
  const allEntries = computed(() =>
    [...notificationEntries.value, ...actionableEntries.value].sort(compareEntriesByDate),
  )

  function getSectionItems(sectionKey: InboxSectionKey) {
    return actionableEntries.value.filter((entry) => getSectionKey(entry.dateValue) === sectionKey)
  }

  const overdueEntries = computed(() => getSectionItems('overdue'))
  const todayEntries = computed(() => getSectionItems('today'))
  const upcomingEntries = computed(() => getSectionItems('upcoming'))
  const laterEntries = computed(() => getSectionItems('later'))
  const unplannedEntries = computed(() => getSectionItems('unplanned'))

  const totalEntries = computed(() => allEntries.value.length)
  const hasInboxItems = computed(() => totalEntries.value > 0)

  const summaryCards = computed<InboxSummaryCard[]>(() => [
    {
      key: 'total',
      labelKey: 'navigation.inbox',
      icon: 'mdi-briefcase-clock-outline',
      count: totalEntries.value,
      tone: 'primary',
    },
    {
      key: 'overdue',
      labelKey: 'inbox.overdue',
      icon: 'mdi-alert-circle-outline',
      count: overdueEntries.value.length,
      tone: 'warning',
    },
    {
      key: 'today',
      labelKey: 'inbox.today',
      icon: 'mdi-calendar-today',
      count: todayEntries.value.length,
      tone: 'info',
    },
    {
      key: 'upcoming',
      labelKey: 'inbox.upcoming',
      icon: 'mdi-calendar-clock-outline',
      count: upcomingEntries.value.length,
      tone: 'success',
    },
    {
      key: 'later',
      labelKey: 'inbox.later',
      icon: 'mdi-timeline-clock-outline',
      count: laterEntries.value.length,
      tone: 'primary',
    },
  ])

  const sections = computed<InboxSection[]>(() => [
    {
      key: 'overdue',
      titleKey: 'inbox.overdue',
      subtitleKey: 'inbox.overdueSummary',
      emptyKey: 'inbox.overdueEmpty',
      icon: 'mdi-alert-circle-outline',
      tone: 'warning',
      count: overdueEntries.value.length,
      items: overdueEntries.value,
      empty: overdueEntries.value.length === 0,
    },
    {
      key: 'today',
      titleKey: 'inbox.today',
      subtitleKey: 'inbox.todaySummary',
      emptyKey: 'inbox.todayEmpty',
      icon: 'mdi-calendar-today',
      tone: 'info',
      count: todayEntries.value.length,
      items: todayEntries.value,
      empty: todayEntries.value.length === 0,
    },
    {
      key: 'upcoming',
      titleKey: 'inbox.upcoming',
      subtitleKey: 'inbox.upcomingSummary',
      emptyKey: 'inbox.upcomingEmpty',
      icon: 'mdi-calendar-range-outline',
      tone: 'success',
      count: upcomingEntries.value.length,
      items: upcomingEntries.value,
      empty: upcomingEntries.value.length === 0,
    },
    {
      key: 'later',
      titleKey: 'inbox.later',
      subtitleKey: 'inbox.laterSummary',
      emptyKey: 'inbox.laterEmpty',
      icon: 'mdi-timeline-clock-outline',
      tone: 'primary',
      count: laterEntries.value.length,
      items: laterEntries.value,
      empty: laterEntries.value.length === 0,
    },
    {
      key: 'unplanned',
      titleKey: 'inbox.unplanned',
      subtitleKey: 'inbox.unplannedSummary',
      emptyKey: 'inbox.unplannedEmpty',
      icon: 'mdi-calendar-question-outline',
      tone: 'secondary',
      count: unplannedEntries.value.length,
      items: unplannedEntries.value,
      empty: unplannedEntries.value.length === 0,
    },
  ])
  //#endregion

  //#region Dialog Management
  function closeDialog() {
    dialog.value = false
    emit('close')
  }
  //#endregion

  //#region Return
  return {
    isLoading,
    dialog,
    notificationEntries,
    ticketEntries,
    taskEntries,
    salesOpportunityEntries,
    effortEstimateEntries,
    totalEntries,
    hasInboxItems,
    summaryCards,
    sections,
    openEntry,
    dismissEntry,
    closeDialog,
  }
  //#endregion
}
