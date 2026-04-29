import axios from 'axios'
import type {
  AiChatMessageItem,
  AiChatSessionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
} from '@/entity/entity'
import { BACKEND_URL } from '@/constants/project.constants'
import { pushApiErrorMessage } from '@/services/api.error.service'

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

export interface VectorizeEntityPayload {
  entityHandle: string
  providerHandle: string
  modelHandle: string
}

export interface VectorizeEntityResponse {
  entityHandle: string
  providerHandle: string
  modelHandle: string
  totalSourceRecords: number
  totalDocuments: number
  embeddedDocuments: number
  skippedDocuments: number
  deletedDocuments: number
}

export interface AiChatStreamEvent {
  type: string
  session?: AiChatSessionItem
  message?: AiChatMessageItem
  handle?: number
  delta?: string
  messageText?: string
}

export interface AiChatMessageListMeta {
  limit: number
  hasMore: boolean
  nextBeforeSequence: number | null
}

export interface AiChatMessageListResponse {
  data: AiChatMessageItem[]
  meta: AiChatMessageListMeta
}

class ApiAiService {
  static async listProviders(): Promise<AiProviderTypeItem[]> {
    try {
      const response = await axios.get<AiProviderTypeItem[]>(`${BACKEND_URL}ai/chat/providers`)
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.providerListFailed')
      throw error
    }
  }

  static async listModels(providerHandle?: string): Promise<AiProviderModelItem[]> {
    try {
      const response = await axios.get<AiProviderModelItem[]>(`${BACKEND_URL}ai/chat/models`, {
        params: {
          providerHandle: providerHandle ?? undefined,
        },
      })

      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.modelListFailed')
      throw error
    }
  }

  static async listVectorizationProviders(): Promise<AiProviderTypeItem[]> {
    try {
      const response = await axios.get<AiProviderTypeItem[]>(
        `${BACKEND_URL}ai/vectorization/providers`,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiVectorization.providerListFailed', 'aiVectorization')
      throw error
    }
  }

  static async listVectorizationModels(providerHandle?: string): Promise<AiProviderModelItem[]> {
    try {
      const response = await axios.get<AiProviderModelItem[]>(
        `${BACKEND_URL}ai/vectorization/models`,
        {
          params: {
            providerHandle: providerHandle ?? undefined,
          },
        },
      )

      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiVectorization.modelListFailed', 'aiVectorization')
      throw error
    }
  }

  static async vectorizeEntity(payload: VectorizeEntityPayload): Promise<VectorizeEntityResponse> {
    try {
      const response = await axios.post<VectorizeEntityResponse>(
        `${BACKEND_URL}ai/vectorization`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiVectorization.runFailed', 'aiVectorization')
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

  static async createSession(payload: CreateAiChatSessionPayload): Promise<AiChatSessionItem> {
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

  static async listMessages(
    sessionHandle: number,
    options?: {
      limit?: number
      beforeSequence?: number | null
    },
  ): Promise<AiChatMessageListResponse> {
    try {
      const response = await axios.get<AiChatMessageListResponse>(
        `${BACKEND_URL}ai/chat/sessions/${sessionHandle}/messages`,
        {
          params: {
            limit: options?.limit,
            beforeSequence: options?.beforeSequence ?? undefined,
          },
        },
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
      pushApiErrorMessage(new Error(errorMessage), errorMessage, 'aiChat')
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

  private static handleError(error: unknown, fallbackMessage: string, context = 'aiChat') {
    pushApiErrorMessage(error, fallbackMessage, context)
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
