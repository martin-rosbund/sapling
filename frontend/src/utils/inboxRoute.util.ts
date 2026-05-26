import type {
  EffortEstimateItem,
  EventItem,
  InboxNotificationItem,
  SalesOpportunityItem,
  TicketItem,
} from '@/entity/entity'
import type { RouteLocationRaw } from 'vue-router'

export function getTicketInboxRoute(ticket: TicketItem): RouteLocationRaw {
  return {
    path: '/table/ticket',
    query: {
      filter: JSON.stringify({ handle: ticket.handle }),
    },
  }
}

export function getTaskInboxRoute(task: EventItem): RouteLocationRaw {
  return {
    path: '/table/event',
    query: {
      filter: JSON.stringify({ handle: task.handle }),
    },
  }
}

export function getSalesOpportunityInboxRoute(opportunity: SalesOpportunityItem): RouteLocationRaw {
  return {
    path: '/table/salesOpportunity',
    query: {
      filter: JSON.stringify({ handle: opportunity.handle }),
    },
  }
}

export function getEffortEstimateInboxRoute(estimate: EffortEstimateItem): RouteLocationRaw {
  return {
    path: '/table/effortEstimate',
    query: {
      filter: JSON.stringify({ handle: estimate.handle }),
    },
  }
}

export function getNotificationInboxRoute(notification: InboxNotificationItem): RouteLocationRaw {
  const entityHandle =
    typeof notification.entity === 'object'
      ? String(notification.entity.handle ?? '').trim()
      : String(notification.entity ?? '').trim()
  const referenceHandle = notification.referenceHandle?.trim()

  if (entityHandle && referenceHandle) {
    return {
      path: `/table/${entityHandle}`,
      query: {
        filter: JSON.stringify({ handle: referenceHandle }),
      },
    }
  }

  return {
    path: '/table/inboxNotification',
    query: {
      filter: JSON.stringify({ handle: notification.handle }),
    },
  }
}
