import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'
import type { EntityItem, PersonItem, SaplingGenericItem } from '@/entity/entity'

export interface ScriptResultClient {
  isSuccess: boolean
  parameter: string
  method: number
  item: object
}

class ApiScriptService {
  static async runClient(
    items: SaplingGenericItem[],
    entity: EntityItem,
    user: PersonItem,
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient> {
    try {
      const response = await axios.post<ScriptResultClient>(buildApiUrl('script/runClient'), {
        items,
        entity,
        user,
        name,
        parameter,
      })
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entity.handle || 'script')
      throw error
    }
  }
}

export default ApiScriptService
