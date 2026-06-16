import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

class ApiSystemService {
  static async get<T>(endpoint: string): Promise<T> {
    const normalizedEndpoint = endpoint.replace(/^\/+/, '').replace(/^system\/?/, '')
    const path = `system/${normalizedEndpoint}`

    try {
      const response = await axios.get<T>(buildApiUrl(path))
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', path)
      throw error
    }
  }
}

export default ApiSystemService
