import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

export type CalendarSyncProvider = 'azure' | 'google'

export interface CalendarImportPayload {
  startDateTime: string
  endDateTime: string
}

export interface CalendarImportResult {
  imported: number
  created: number
  updated: number
  skipped: number
}

class ApiCalendarService {
  static async importEvents(
    provider: CalendarSyncProvider,
    payload: CalendarImportPayload,
  ): Promise<CalendarImportResult> {
    const endpoint = `${provider}/events/import`

    try {
      const response = await axios.post<CalendarImportResult>(buildApiUrl(endpoint), payload)
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', endpoint)
      throw error
    }
  }
}

export default ApiCalendarService
