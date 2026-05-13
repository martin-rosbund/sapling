import { onBeforeUnmount, onMounted } from 'vue'
import { BACKEND_URL } from '@/constants/project.constants'
import type {
  EventItem,
  InboxNotificationItem,
  SalesOpportunityItem,
  TicketItem,
} from '@/entity/entity'

const OPEN_TASK_SNAPSHOT_EVENT = 'open-task-snapshot'

export interface OpenTaskSnapshot {
  count: number
  tickets: TicketItem[]
  tasks: EventItem[]
  salesOpportunities: SalesOpportunityItem[]
  notifications: InboxNotificationItem[]
}

export type OpenTaskStreamItemKind = 'ticket' | 'event' | 'salesOpportunity' | 'notification'

export interface OpenTaskStreamItem {
  id: string
  kind: OpenTaskStreamItemKind
  title: string
  icon: string
  timestamp: number
}

export interface OpenTaskUpdateContext {
  source: 'stream' | 'local'
  newItems: OpenTaskStreamItem[]
}

type OpenTaskCountListener = (
  snapshot: OpenTaskSnapshot,
  context?: OpenTaskUpdateContext,
) => void

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

function toTitle(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : fallback
}

function createItemId(kind: OpenTaskStreamItemKind, parts: Array<string | number | null | undefined>) {
  const normalizedParts = parts
    .map((part) => String(part ?? '').trim())
    .filter((part) => part.length > 0)

  return `${kind}:${normalizedParts.join(':')}`
}

function createTicketStreamItem(ticket: TicketItem): OpenTaskStreamItem {
  return {
    id: createItemId('ticket', [ticket.handle, ticket.createdAt, ticket.title]),
    kind: 'ticket',
    title: toTitle(ticket.title, 'Ticket'),
    icon: 'mdi-ticket-confirmation-outline',
    timestamp: toTimestamp(ticket.createdAt ?? ticket.deadlineDate),
  }
}

function createTaskStreamItem(task: EventItem): OpenTaskStreamItem {
  return {
    id: createItemId('event', [task.handle, task.transactionHandle, task.createdAt, task.title]),
    kind: 'event',
    title: toTitle(task.title, 'Termin'),
    icon: task.type?.icon || 'mdi-calendar-clock-outline',
    timestamp: toTimestamp(task.createdAt ?? task.startDate),
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
    title: toTitle(opportunity.title, 'Verkaufschance'),
    icon: opportunity.type?.icon || 'mdi-chart-timeline-variant',
    timestamp: toTimestamp(opportunity.createdAt ?? opportunity.closeDate),
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
    title: toTitle(notification.title, 'Inbox'),
    icon:
      typeof notification.entity === 'object'
        ? (notification.entity.icon ?? 'mdi-bell-outline')
        : 'mdi-bell-outline',
    timestamp: toTimestamp(notification.createdAt),
  }
}

function collectSnapshotItems(snapshot: OpenTaskSnapshot): OpenTaskStreamItem[] {
  return [
    ...snapshot.notifications.map(createNotificationStreamItem),
    ...snapshot.tickets.map(createTicketStreamItem),
    ...snapshot.tasks.map(createTaskStreamItem),
    ...snapshot.salesOpportunities.map(createSalesOpportunityStreamItem),
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
    newItems: source === 'stream' && previousSnapshot ? findNewItems(previousSnapshot, snapshot) : [],
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
