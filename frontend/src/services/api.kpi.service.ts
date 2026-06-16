import axios from 'axios'
import type { KpiResponse } from '@/entity/structure'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

class ApiKpiService {
  static async execute<T>(handle: string | number): Promise<KpiResponse<T>> {
    const endpoint = `kpi/execute/${handle}`

    try {
      const response = await axios.get<KpiResponse<T>>(buildApiUrl(endpoint))
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', endpoint)
      throw error
    }
  }
}

export default ApiKpiService
