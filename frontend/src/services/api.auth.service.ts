import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

class ApiAuthService {
  static async logout(): Promise<void> {
    await this.post('logout')
  }

  static async startImpersonation(targetHandle: string | number): Promise<void> {
    await this.post(`impersonate/${targetHandle}`)
  }

  static async stopImpersonation(): Promise<void> {
    await this.post('impersonate/stop')
  }

  private static async post(path: string): Promise<void> {
    const endpoint = `auth/${path.replace(/^\/+/, '')}`

    try {
      await axios.post(buildApiUrl(endpoint))
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', endpoint)
      throw error
    }
  }
}

export default ApiAuthService
