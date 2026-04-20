import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import type { EntityItem, PersonItem, SaplingGenericItem } from '@/entity/entity'

export interface ScriptResultClient {
  isSuccess: boolean
  parameter: string
  method: number
  item: object
}

const messageCenter = useSaplingMessageCenter()

class ApiScriptService {
  static async runClient(
    items: SaplingGenericItem[],
    entity: EntityItem,
    user: PersonItem,
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient> {
    try {
      const response = await axios.post<ScriptResultClient>(`${BACKEND_URL}script/runClient`, {
        items,
        entity,
        user,
        name,
        parameter,
      })
      return response.data
    } catch (error: unknown) {
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entity.handle || 'script')
      throw error
    }
  }
}

export default ApiScriptService
