import axios from 'axios'
import type {
  AiChatMessageItem,
  AiChatSessionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
} from '@/entity/entity'
import { BACKEND_URL } from '@/constants/project.constants'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import ApiGenericService from './api.generic.service'

export interface CreateAiChatSessionPayload {
  title?: string
  providerHandle?: string
  modelHandle?: string
}

export interface UpdateAiChatSessionPayload {
  title?: string
  isArchived?: boolean
  providerHandle?: string
  modelHandle?: string
}

export interface CreateAiChatMessagePayload {
  sessionHandle?: number
  sessionTitle?: string
  content: string
  routeName?: string
  url?: string
  pageTitle?: string
  providerHandle?: string
  modelHandle?: string
  contextPayload?: Record<string, unknown>
}

export interface AiChatStreamEvent {
  type: string
  session?: AiChatSessionItem
  message?: AiChatMessageItem
  handle?: number
  delta?: string
  messageText?: string
}

const messageCenter = useSaplingMessageCenter()

class ApiAiService {
  static async listProviders(): Promise<AiProviderTypeItem[]> {
    try {
      const response = await ApiGenericService.find<AiProviderTypeItem>('aiProviderType', {
        filter: { isActive: true },
        orderBy: { title: 'ASC' },
        limit: 100,
      })

      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.providerListFailed')
      throw error
    }
  }

  static async listModels(providerHandle?: string): Promise<AiProviderModelItem[]> {
    try {
      const response = await ApiGenericService.find<AiProviderModelItem>('aiProviderModel', {
        filter: { isActive: true },
        relations: ['provider'],
        limit: 200,
      })

      return response.data
        .filter((model) => !providerHandle || this.getProviderHandle(model.provider) === providerHandle)
        .sort((left, right) => {
          const providerTitleComparison = this.getProviderTitle(left.provider)
            .localeCompare(this.getProviderTitle(right.provider), undefined, { sensitivity: 'base' })

          if (providerTitleComparison !== 0) {
            return providerTitleComparison
          }

          if (left.isDefault !== right.isDefault) {
            return left.isDefault ? -1 : 1
          }

          const leftSortOrder = left.sortOrder ?? 0
          const rightSortOrder = right.sortOrder ?? 0

          if (leftSortOrder !== rightSortOrder) {
            return leftSortOrder - rightSortOrder
          }

          return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
        })
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.modelListFailed')
      throw error
    }
  }

  static async listSessions(includeArchived = false): Promise<AiChatSessionItem[]> {
    try {
      const response = await axios.get<AiChatSessionItem[]>(`${BACKEND_URL}ai/chat/sessions`, {
        params: { includeArchived },
      })
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.sessionListFailed')
      throw error
    }
  }

  static async createSession(
    payload: CreateAiChatSessionPayload,
  ): Promise<AiChatSessionItem> {
    try {
      const response = await axios.post<AiChatSessionItem>(
        `${BACKEND_URL}ai/chat/sessions`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.sessionCreateFailed')
      throw error
    }
  }

  static async updateSession(
    handle: number,
    payload: UpdateAiChatSessionPayload,
  ): Promise<AiChatSessionItem> {
    try {
      const response = await axios.patch<AiChatSessionItem>(
        `${BACKEND_URL}ai/chat/sessions/${handle}`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.sessionUpdateFailed')
      throw error
    }
  }

  static async listMessages(sessionHandle: number): Promise<AiChatMessageItem[]> {
    try {
      const response = await axios.get<AiChatMessageItem[]>(
        `${BACKEND_URL}ai/chat/sessions/${sessionHandle}/messages`,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.messageListFailed')
      throw error
    }
  }

  static async createMessage(
    payload: CreateAiChatMessagePayload,
  ): Promise<{ session: AiChatSessionItem; message: AiChatMessageItem }> {
    try {
      const response = await axios.post<{ session: AiChatSessionItem; message: AiChatMessageItem }>(
        `${BACKEND_URL}ai/chat/messages`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.messageCreateFailed')
      throw error
    }
  }

  static async streamMessage(
    payload: CreateAiChatMessagePayload,
    onEvent: (event: AiChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch(`${BACKEND_URL}ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal,
    })

    if (!response.ok || !response.body) {
      const errorMessage = `ai.chat.streamFailed (${response.status})`
      messageCenter.pushMessage('error', errorMessage, '', 'aiChat')
      throw new Error(errorMessage)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) {
          continue
        }

        onEvent(JSON.parse(trimmedLine) as AiChatStreamEvent)
      }
    }

    const remaining = buffer.trim()
    if (remaining) {
      onEvent(JSON.parse(remaining) as AiChatStreamEvent)
    }
  }

  private static handleError(error: unknown, fallbackMessage: string) {
    let message = fallbackMessage
    let description = ''

    if (typeof error === 'object' && error !== null) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } }
        message?: string
      }
      message = err.response?.data?.message || err.message || fallbackMessage
      description = err.response?.data?.error || ''
    }

    messageCenter.pushMessage('error', message, description, 'aiChat')
  }

  private static getProviderHandle(provider?: AiProviderTypeItem | string | null): string | null {
    if (!provider) {
      return null
    }

    if (typeof provider === 'string') {
      return provider
    }

    return provider.handle ?? null
  }

  private static getProviderTitle(provider?: AiProviderTypeItem | string | null): string {
    if (!provider) {
      return ''
    }

    if (typeof provider === 'string') {
      return provider
    }

    return provider.title ?? ''
  }
}

export default ApiAiService