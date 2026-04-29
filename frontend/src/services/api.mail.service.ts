import { BACKEND_URL } from '@/constants/project.constants'
import type { EntityTemplate } from '@/entity/structure'
import axios from 'axios'
import { pushApiErrorMessage } from '@/services/api.error.service'

export type MailPreviewPayload = {
  entityHandle: string
  itemHandle?: string | number
  templateHandle?: number
  subject?: string
  bodyMarkdown?: string
  to?: string[] | string
  cc?: string[] | string
  bcc?: string[] | string
  draftValues?: Record<string, unknown>
  attachmentHandles?: number[]
}

export type MailPreviewResult = {
  entityHandle: string
  itemHandle?: string | number
  templateHandle?: number
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  bodyMarkdown: string
  bodyHtml: string
  attachmentHandles?: number[]
}

export type MailDeliveryResult = {
  handle?: number
  status?: { handle: string; description: string }
  responseStatusCode?: number
  responseBody?: object
}

class ApiMailService {
  static async getEntityTemplate(entityHandle: string): Promise<EntityTemplate[]> {
    try {
      const response = await axios.get<EntityTemplate[]>(`${BACKEND_URL}template/${entityHandle}`)

      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async preview(payload: MailPreviewPayload): Promise<MailPreviewResult> {
    try {
      const response = await axios.post<MailPreviewResult>(`${BACKEND_URL}mail/preview`, payload)

      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', 'mail')
      throw error
    }
  }

  static async send(payload: MailPreviewPayload): Promise<MailDeliveryResult> {
    try {
      const response = await axios.post<MailDeliveryResult>(`${BACKEND_URL}mail/send`, payload)

      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', 'mail')
      throw error
    }
  }
}

export default ApiMailService
