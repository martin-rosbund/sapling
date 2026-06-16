import axios from 'axios'
import type { AccumulatedPermission } from '@/entity/structure'
import type { InboxNotificationItem, PersonItem, WorkHourWeekItem } from '@/entity/entity'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

export interface CurrentProfileUpdatePayload {
  firstName: string
  lastName: string
  phone?: string | null
  mobile?: string | null
  color?: string | null
}

export interface CurrentEntityMetadataResponse<TEntity = unknown, TTemplate = unknown> {
  entityHandle: string
  entity: TEntity | null
  entityPermission: AccumulatedPermission | null
  entityTemplates: TTemplate[]
}

export interface CalendarSyncSubscription {
  handle?: number
  isAvailable: boolean
  isActive: boolean
  syncRange: 'day' | 'week' | 'month'
  intervalMinutes: number
  lastRunAt?: string | Date | null
  lastSuccessAt?: string | Date | null
  lastError?: string | null
  lastImportedCount: number
  lastCreatedCount: number
  lastUpdatedCount: number
  lastSkippedCount: number
}

export interface UpdateCalendarSyncSubscriptionPayload {
  isActive: boolean
  syncRange: CalendarSyncSubscription['syncRange']
  intervalMinutes: number
}

export interface CurrentSessionDto {
  id: string
  isCurrent: boolean
  deviceLabel: string
  createdAt: string | Date | null
  lastActivityAt: string | Date | null
  expiresAt: string | Date
}

export interface TerminateSessionsResult {
  terminatedCount: number
  sessions: CurrentSessionDto[]
}

class ApiCurrentService {
  static async getPerson(): Promise<PersonItem> {
    return this.get<PersonItem>('person')
  }

  static async updateProfile(payload: CurrentProfileUpdatePayload): Promise<PersonItem> {
    return this.patch<PersonItem>('profile', payload)
  }

  static async getPermissions(): Promise<AccumulatedPermission[]> {
    return this.get<AccumulatedPermission[]>('permission')
  }

  static async getMetadata<TEntity, TTemplate>(
    entityHandles: string[],
  ): Promise<CurrentEntityMetadataResponse<TEntity, TTemplate>[]> {
    const query = entityHandles.map(encodeURIComponent).join(',')
    return this.get<CurrentEntityMetadataResponse<TEntity, TTemplate>[]>(`meta?entities=${query}`)
  }

  static async getWorkWeek(): Promise<WorkHourWeekItem | null> {
    return this.get<WorkHourWeekItem | null>('workWeek')
  }

  static async getCalendarSync(): Promise<CalendarSyncSubscription> {
    return this.get<CalendarSyncSubscription>('calendarSync')
  }

  static async updateCalendarSync(
    payload: UpdateCalendarSyncSubscriptionPayload,
  ): Promise<CalendarSyncSubscription> {
    return this.patch<CalendarSyncSubscription>('calendarSync', payload)
  }

  static async getSessions(): Promise<CurrentSessionDto[]> {
    return this.get<CurrentSessionDto[]>('sessions')
  }

  static async terminateOtherSessions(): Promise<TerminateSessionsResult> {
    return this.post<TerminateSessionsResult>('sessions/terminateOthers')
  }

  static async markInboxNotificationRead(handle: string | number): Promise<InboxNotificationItem> {
    return this.post<InboxNotificationItem>(`inboxNotification/${handle}/read`)
  }

  private static async get<T>(path: string): Promise<T> {
    return this.request<T>('get', path)
  }

  private static async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('post', path, body)
  }

  private static async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('patch', path, body)
  }

  private static async request<T>(
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const endpoint = `current/${path.replace(/^\/+/, '')}`

    try {
      const response =
        method === 'get'
          ? await axios.get<T>(buildApiUrl(endpoint))
          : method === 'post'
            ? await axios.post<T>(buildApiUrl(endpoint), body)
            : await axios.patch<T>(buildApiUrl(endpoint), body)
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', endpoint)
      throw error
    }
  }
}

export default ApiCurrentService
