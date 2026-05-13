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

type OpenTaskCountListener = (snapshot: OpenTaskSnapshot) => void

const listeners = new Set<OpenTaskCountListener>()
let eventSource: EventSource | null = null
let latestSnapshot: OpenTaskSnapshot | null = null

function notifyListeners(snapshot: OpenTaskSnapshot) {
  for (const listener of listeners) {
    listener(snapshot)
  }
}

function applySnapshot(snapshot: OpenTaskSnapshot) {
  latestSnapshot = snapshot
  notifyListeners(snapshot)
}

function handleSnapshotEvent(event: Event) {
  const messageEvent = event as MessageEvent<string | OpenTaskSnapshot>

  try {
    const rawPayload =
      typeof messageEvent.data === 'string' ? JSON.parse(messageEvent.data) : messageEvent.data

    if (!rawPayload || typeof rawPayload !== 'object') {
      return
    }

    applySnapshot(rawPayload as OpenTaskSnapshot)
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
  applySnapshot(snapshot)
}

export function useOpenTaskCountEvents(listener: OpenTaskCountListener) {
  onMounted(() => {
    listeners.add(listener)

    if (latestSnapshot) {
      listener(latestSnapshot)
    }

    ensureEventSource()
  })

  onBeforeUnmount(() => {
    listeners.delete(listener)
    disposeEventSource()
  })
}
