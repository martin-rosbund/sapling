import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

class ApiDocumentService {
  static async upload(
    entityHandle: string,
    reference: string,
    formData: FormData,
  ): Promise<unknown> {
    try {
      const response = await axios.post(
        buildApiUrl(`document/upload/${entityHandle}/${reference}`),
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }
}

export default ApiDocumentService
