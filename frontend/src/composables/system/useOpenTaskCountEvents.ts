import { onBeforeUnmount, onMounted } from 'vue'
import { BACKEND_URL } from '@/constants/project.constants'
import type {
  EffortEstimateItem,
  EventItem,
  InboxNotificationItem,
  SalesOpportunityItem,
  TicketItem,
} from '@/entity/entity'
import type { RouteLocationRaw } from 'vue-router'
import {
  getNotificationInboxRoute,
  getEffortEstimateInboxRoute,
  getSalesOpportunityInboxRoute,
  getTaskInboxRoute,
  getTicketInboxRoute,
} from '@/utils/inboxRoute.util'

const OPEN_TASK_SNAPSHOT_EVENT = 'open-task-snapshot'

export interface OpenTaskSnapshot {
  count: number
  tickets: TicketItem[]
  tasks: EventItem[]
  salesOpportunities: SalesOpportunityItem[]
  effortEstimates: EffortEstimateItem[]
  notifications: InboxNotificationItem[]
}

export type OpenTaskStreamItemKind =
  | 'ticket'
  | 'event'
  | 'salesOpportunity'
  | 'effortEstimate'
  | 'notification'

export interface OpenTaskStreamItem {
  id: string
  kind: OpenTaskStreamItemKind
  title: string
  bodyText: string
  icon: string
  timestamp: number
  route: RouteLocationRaw
}

export interface OpenTaskUpdateContext {
  source: 'stream' | 'local'
  newItems: OpenTaskStreamItem[]
}

type OpenTaskCountListener = (snapshot: OpenTaskSnapshot, context?: OpenTaskUpdateContext) => void

const listeners = new Set<OpenTaskCountListener>()
let eventSource: EventSource | null = null
let latestSnapshot: OpenTaskSnapshot | null = null

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return 0
  }

  const dateValue = typeof value === 'string' ? new Date(value) : value
  const timestamp = dateValue.getTime()

  return Number.isFinite(timestamp) ? timestamp : 0
}

function toTitle(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  return trimmedValue
}

function createItemId(
  kind: OpenTaskStreamItemKind,
  parts: Array<string | number | Date | null | undefined>,
) {
  const normalizedParts = parts
    .map((part) => String(part ?? '').trim())
    .filter((part) => part.length > 0)

  return `${kind}:${normalizedParts.join(':')}`
}

function createTicketStreamItem(ticket: TicketItem): OpenTaskStreamItem {
  return {
    id: createItemId('ticket', [ticket.handle, ticket.createdAt, ticket.title]),
    kind: 'ticket',
    title: toTitle(ticket.title),
    bodyText: toTitle(ticket.problemDescription),
    icon: 'mdi-ticket-confirmation-outline',
    timestamp: toTimestamp(ticket.createdAt ?? ticket.deadlineDate),
    route: getTicketInboxRoute(ticket),
  }
}

function createTaskStreamItem(task: EventItem): OpenTaskStreamItem {
  return {
    id: createItemId('event', [task.handle, task.transactionHandle, task.createdAt, task.title]),
    kind: 'event',
    title: toTitle(task.title),
    bodyText: toTitle(task.description),
    icon: task.type?.icon || 'mdi-calendar-clock-outline',
    timestamp: toTimestamp(task.createdAt ?? task.startDate),
    route: getTaskInboxRoute(task),
  }
}

function createSalesOpportunityStreamItem(opportunity: SalesOpportunityItem): OpenTaskStreamItem {
  return {
    id: createItemId('salesOpportunity', [
      opportunity.handle,
      opportunity.createdAt,
      opportunity.title,
    ]),
    kind: 'salesOpportunity',
    title: toTitle(opportunity.title),
    bodyText: toTitle(opportunity.nextStep ?? opportunity.description ?? opportunity.painPoints),
    icon: opportunity.type?.icon || 'mdi-chart-timeline-variant',
    timestamp: toTimestamp(opportunity.createdAt ?? opportunity.closeDate),
    route: getSalesOpportunityInboxRoute(opportunity),
  }
}

function createEffortEstimateStreamItem(estimate: EffortEstimateItem): OpenTaskStreamItem {
  return {
    id: createItemId('effortEstimate', [estimate.handle, estimate.createdAt, estimate.title]),
    kind: 'effortEstimate',
    title: toTitle(estimate.title),
    bodyText: toTitle(estimate.requirementsMarkdown),
    icon: 'mdi-clipboard-text-clock-outline',
    timestamp: toTimestamp(estimate.createdAt ?? estimate.expectedCompletionDate),
    route: getEffortEstimateInboxRoute(estimate),
  }
}

function createNotificationStreamItem(notification: InboxNotificationItem): OpenTaskStreamItem {
  return {
    id: createItemId('notification', [
      notification.handle,
      notification.createdAt,
      notification.referenceHandle,
      notification.title,
    ]),
    kind: 'notification',
    title: toTitle(notification.title),
    bodyText: toTitle(notification.bodyText),
    icon:
      typeof notification.entity === 'object'
        ? (notification.entity.icon ?? 'mdi-bell-outline')
        : 'mdi-bell-outline',
    timestamp: toTimestamp(notification.createdAt),
    route: getNotificationInboxRoute(notification),
  }
}

function collectSnapshotItems(snapshot: OpenTaskSnapshot): OpenTaskStreamItem[] {
  return [
    ...snapshot.notifications.map(createNotificationStreamItem),
    ...snapshot.tickets.map(createTicketStreamItem),
    ...snapshot.tasks.map(createTaskStreamItem),
    ...snapshot.salesOpportunities.map(createSalesOpportunityStreamItem),
    ...(snapshot.effortEstimates ?? []).map(createEffortEstimateStreamItem),
  ]
}

function findNewItems(
  previousSnapshot: OpenTaskSnapshot,
  nextSnapshot: OpenTaskSnapshot,
): OpenTaskStreamItem[] {
  const previousItemIds = new Set(collectSnapshotItems(previousSnapshot).map((item) => item.id))

  return collectSnapshotItems(nextSnapshot)
    .filter((item) => !previousItemIds.has(item.id))
    .sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp
      }

      return left.title.localeCompare(right.title)
    })
}

function notifyListeners(snapshot: OpenTaskSnapshot, context: OpenTaskUpdateContext) {
  for (const listener of listeners) {
    listener(snapshot, context)
  }
}

function applySnapshot(snapshot: OpenTaskSnapshot, source: OpenTaskUpdateContext['source']) {
  const previousSnapshot = latestSnapshot
  latestSnapshot = snapshot
  notifyListeners(snapshot, {
    source,
    newItems:
      source === 'stream' && previousSnapshot ? findNewItems(previousSnapshot, snapshot) : [],
  })
}

function handleSnapshotEvent(event: Event) {
  const messageEvent = event as MessageEvent<string | OpenTaskSnapshot>

  try {
    const rawPayload =
      typeof messageEvent.data === 'string' ? JSON.parse(messageEvent.data) : messageEvent.data

    if (!rawPayload || typeof rawPayload !== 'object') {
      return
    }

    applySnapshot(rawPayload as OpenTaskSnapshot, 'stream')
  } catch {
    // Ignore malformed SSE payloads and wait for the next event.
  }
}

function ensureEventSource() {
  if (eventSource || typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return
  }

  eventSource = new EventSource(`${BACKEND_URL}current/openTaskCountEvents`, {
    withCredentials: true,
  })
  eventSource.addEventListener(OPEN_TASK_SNAPSHOT_EVENT, handleSnapshotEvent)
}

function disposeEventSource() {
  if (!eventSource || listeners.size > 0) {
    return
  }

  eventSource.removeEventListener(OPEN_TASK_SNAPSHOT_EVENT, handleSnapshotEvent)
  eventSource.close()
  eventSource = null
}

export function updateOpenTaskSnapshot(snapshot: OpenTaskSnapshot) {
  applySnapshot(snapshot, 'local')
}

export function getLatestOpenTaskSnapshot(): OpenTaskSnapshot | null {
  return latestSnapshot
}

export function useOpenTaskCountEvents(listener: OpenTaskCountListener) {
  onMounted(() => {
    listeners.add(listener)

    if (latestSnapshot) {
      listener(latestSnapshot, { source: 'local', newItems: [] })
    }

    ensureEventSource()
  })

  onBeforeUnmount(() => {
    listeners.delete(listener)
    disposeEventSource()
  })
}
