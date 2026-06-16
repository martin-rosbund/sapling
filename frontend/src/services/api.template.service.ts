import axios from 'axios'
import type { EntityTemplate } from '@/entity/structure'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

class ApiTemplateService {
  static async getEntityTemplate(entityHandle: string): Promise<EntityTemplate[]> {
    try {
      const response = await axios.get<EntityTemplate[]>(buildApiUrl(`template/${entityHandle}`))
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }
}

export default ApiTemplateService
