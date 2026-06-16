import axios from 'axios'
import type {
  AiAgentItem,
  AiAgentEvaluationItem,
  AiAgentMemoryItem,
  AiAgentPlaybookItem,
  AiAgentRunItem,
  AiAgentVersionItem,
  AiChatAttachmentItem,
  AiChatMessageItem,
  AiChatSessionItem,
  AiChatToolActionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
} from '@/entity/entity'
import { buildApiUrl } from '@/services/api.client'
import { pushApiErrorMessage } from '@/services/api.error.service'

export interface CreateAiChatSessionPayload {
  title?: string
  providerHandle?: string
  modelHandle?: string
  agentHandle?: string
  agentVersionHandle?: number
  playbookHandle?: string
  contextEntityHandle?: string
  contextRecordHandle?: string
}

export interface UpdateAiChatSessionPayload {
  title?: string
  isArchived?: boolean
  providerHandle?: string
  modelHandle?: string
  agentHandle?: string
  agentVersionHandle?: number
  playbookHandle?: string
  contextEntityHandle?: string
  contextRecordHandle?: string
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
  agentHandle?: string
  agentVersionHandle?: number
  playbookHandle?: string
  contextEntityHandle?: string
  contextRecordHandle?: string
  transcriptionHandle?: number
  attachmentHandles?: number[]
  contextPayload?: Record<string, unknown>
  clientCurrentDateTime?: string
  clientTimeZone?: string
  clientLocale?: string
  clientUtcOffsetMinutes?: number
}

export interface AiChatImportBatchSummary {
  handle: number | null
  status: string
  filename: string
  mimetype?: string | null
  fileSize?: number | null
  sourceHandle?: string | null
  entityHandle?: string | null
  templateHandle?: number | null
  rowCount: number
  readyCount: number
  errorCount: number
  delimiter?: string | null
  headers: string[]
  sampleRows: Record<string, unknown>[]
}

export interface AiChatAttachmentUploadResponse {
  attachment: AiChatAttachmentItem
  importBatch: AiChatImportBatchSummary
}

export interface CreateAiChatTranscriptionPayload {
  sessionHandle?: number
  providerHandle?: string
  modelHandle?: string
  language?: string
  routeName?: string
  url?: string
  pageTitle?: string
  clientCurrentDateTime?: string
  clientTimeZone?: string
  clientLocale?: string
  clientUtcOffsetMinutes?: number
  durationSeconds?: number
}

export interface CreateAiChatMessageSpeechPayload {
  providerHandle?: string
  modelHandle?: string
}

export interface AiChatTranscriptionResponse {
  transcriptionHandle: number
  transcript: string | null
  detectedLanguage: string | null
  durationSeconds: number | null
  status: string
  providerHandle: string | null
  modelHandle: string | null
  documentHandle: number | null
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
  action?: AiChatToolActionItem
  handle?: number
  delta?: string
  messageText?: string
}

export interface AiMcpToolDescriptor {
  serverHandle: number
  serverName: string
  toolName: string
  description?: string
  inputSchema?: Record<string, unknown> | null
}

export interface AiAgentWorkbenchResponse {
  agent: AiAgentItem
  versions: AiAgentVersionItem[]
  playbooks: AiAgentPlaybookItem[]
  memories: AiAgentMemoryItem[]
  runs: AiAgentRunItem[]
  evaluations: AiAgentEvaluationItem[]
  stats: {
    runsTotal?: number
    failedRuns?: number
    pendingActions?: number
    evaluationTotal?: number
    evaluationPassed?: number
    evaluationPassRate?: number | null
  }
}

export interface CreateAiAgentTestRunPayload {
  prompt: string
  agentVersionHandle?: number
  playbookHandle?: string
  contextEntityHandle?: string
  contextRecordHandle?: string
}

export interface CreateAiAgentEvaluationPayload {
  title: string
  prompt: string
  expectedCriteria?: string
  agentVersionHandle?: number
  targetEntityHandle?: string
  targetRecordHandle?: string
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
      const response = await axios.get<AiProviderTypeItem[]>(buildApiUrl('ai/chat/providers'))
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.providerListFailed')
      throw error
    }
  }

  static async listModels(providerHandle?: string): Promise<AiProviderModelItem[]> {
    try {
      const response = await axios.get<AiProviderModelItem[]>(buildApiUrl('ai/chat/models'), {
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

  static async listAgents(): Promise<AiAgentItem[]> {
    try {
      const response = await axios.get<AiAgentItem[]>(buildApiUrl('ai/chat/agents'))
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.agentListFailed')
      throw error
    }
  }

  static async listMcpTools(): Promise<AiMcpToolDescriptor[]> {
    try {
      const response = await axios.get<AiMcpToolDescriptor[]>(buildApiUrl('ai/chat/tools'))
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.toolListFailed')
      throw error
    }
  }

  static async getAgentWorkbench(agentHandle: string): Promise<AiAgentWorkbenchResponse> {
    try {
      const response = await axios.get<AiAgentWorkbenchResponse>(
        buildApiUrl(`ai/agents/${agentHandle}/workbench`),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiAgentBuilder.workbenchLoadFailed')
      throw error
    }
  }

  static async createAgentTestRun(
    agentHandle: string,
    payload: CreateAiAgentTestRunPayload,
  ): Promise<AiAgentRunItem> {
    try {
      const response = await axios.post<AiAgentRunItem>(
        buildApiUrl(`ai/agents/${agentHandle}/test-runs`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiAgentBuilder.testRunFailed')
      throw error
    }
  }

  static async listAgentRuns(agentHandle: string): Promise<AiAgentRunItem[]> {
    try {
      const response = await axios.get<AiAgentRunItem[]>(
        buildApiUrl(`ai/agents/${agentHandle}/runs`),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiAgentBuilder.runListFailed')
      throw error
    }
  }

  static async listAgentEvaluations(agentHandle: string): Promise<AiAgentEvaluationItem[]> {
    try {
      const response = await axios.get<AiAgentEvaluationItem[]>(
        buildApiUrl(`ai/agents/${agentHandle}/evaluations`),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiAgentBuilder.evaluationListFailed')
      throw error
    }
  }

  static async createAgentEvaluation(
    agentHandle: string,
    payload: CreateAiAgentEvaluationPayload,
  ): Promise<AiAgentEvaluationItem> {
    try {
      const response = await axios.post<AiAgentEvaluationItem>(
        buildApiUrl(`ai/agents/${agentHandle}/evaluations`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiAgentBuilder.evaluationCreateFailed')
      throw error
    }
  }

  static async listTranscriptionProviders(): Promise<AiProviderTypeItem[]> {
    try {
      const response = await axios.get<AiProviderTypeItem[]>(
        buildApiUrl('ai/transcription/providers'),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.transcription.providerListFailed')
      throw error
    }
  }

  static async listTranscriptionModels(providerHandle?: string): Promise<AiProviderModelItem[]> {
    try {
      const response = await axios.get<AiProviderModelItem[]>(
        buildApiUrl('ai/transcription/models'),
        {
          params: {
            providerHandle: providerHandle ?? undefined,
          },
        },
      )

      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.transcription.modelListFailed')
      throw error
    }
  }

  static async listSpeechProviders(): Promise<AiProviderTypeItem[]> {
    try {
      const response = await axios.get<AiProviderTypeItem[]>(buildApiUrl('ai/speech/providers'))
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.speech.providerListFailed')
      throw error
    }
  }

  static async listSpeechModels(providerHandle?: string): Promise<AiProviderModelItem[]> {
    try {
      const response = await axios.get<AiProviderModelItem[]>(buildApiUrl('ai/speech/models'), {
        params: {
          providerHandle: providerHandle ?? undefined,
        },
      })

      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.speech.modelListFailed')
      throw error
    }
  }

  static async listVectorizationProviders(): Promise<AiProviderTypeItem[]> {
    try {
      const response = await axios.get<AiProviderTypeItem[]>(
        buildApiUrl('ai/vectorization/providers'),
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
        buildApiUrl('ai/vectorization/models'),
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
        buildApiUrl('ai/vectorization'),
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
      const response = await axios.get<AiChatSessionItem[]>(buildApiUrl('ai/chat/sessions'), {
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
        buildApiUrl('ai/chat/sessions'),
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
        buildApiUrl(`ai/chat/sessions/${handle}`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.sessionUpdateFailed')
      throw error
    }
  }

  static async applySessionPlaybook(
    handle: number,
    playbookHandle: string,
  ): Promise<AiChatSessionItem> {
    try {
      const response = await axios.post<AiChatSessionItem>(
        buildApiUrl(`ai/chat/sessions/${handle}/playbook`),
        { playbookHandle },
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.playbookApplyFailed')
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
        buildApiUrl(`ai/chat/sessions/${sessionHandle}/messages`),
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
        buildApiUrl('ai/chat/messages'),
        this.withClientTimeContext(payload),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.messageCreateFailed')
      throw error
    }
  }

  static async ensureMessageSpeech(
    handle: number,
    payload?: CreateAiChatMessageSpeechPayload,
    options?: {
      suppressErrorMessage?: boolean
    },
  ): Promise<AiChatMessageItem> {
    try {
      const response = await axios.post<AiChatMessageItem>(
        buildApiUrl(`ai/chat/messages/${handle}/speech`),
        payload ?? {},
      )
      return response.data
    } catch (error: unknown) {
      if (!options?.suppressErrorMessage) {
        this.handleError(error, 'ai.speech.createFailed')
      }
      throw error
    }
  }

  static async confirmToolAction(handle: number): Promise<AiChatToolActionItem> {
    try {
      const response = await axios.post<AiChatToolActionItem>(
        buildApiUrl(`ai/chat/tool-actions/${handle}/confirm`),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.toolActionConfirmFailed')
      throw error
    }
  }

  static async rejectToolAction(handle: number): Promise<AiChatToolActionItem> {
    try {
      const response = await axios.post<AiChatToolActionItem>(
        buildApiUrl(`ai/chat/tool-actions/${handle}/reject`),
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.chat.toolActionRejectFailed')
      throw error
    }
  }

  static async downloadMessageSpeechAudio(
    documentHandle: number,
    options?: {
      suppressErrorMessage?: boolean
    },
  ): Promise<Blob> {
    try {
      const response = await axios.get<Blob>(buildApiUrl(`document/download/${documentHandle}`), {
        responseType: 'blob',
        withCredentials: true,
      })
      return response.data
    } catch (error: unknown) {
      if (!options?.suppressErrorMessage) {
        this.handleError(error, 'ai.speech.playbackFailed')
      }
      throw error
    }
  }

  static async createChatAttachment(
    file: File,
    payload: {
      sessionHandle?: number
      purpose?: string
    } = {},
  ): Promise<AiChatAttachmentUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file, file.name)

      for (const [key, value] of Object.entries(payload)) {
        if (value == null) {
          continue
        }

        formData.append(key, String(value))
      }

      const response = await axios.post<AiChatAttachmentUploadResponse>(
        buildApiUrl('ai/chat/attachments'),
        formData,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'aiChat.attachmentUploadFailed')
      throw error
    }
  }

  static async createTranscription(
    file: File | Blob,
    payload: CreateAiChatTranscriptionPayload = {},
    filename = 'sapling-chat-audio.webm',
  ): Promise<AiChatTranscriptionResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file, filename)

      const enrichedPayload = this.withClientTimeContext(payload)

      for (const [key, value] of Object.entries(enrichedPayload)) {
        if (value == null) {
          continue
        }

        formData.append(key, String(value))
      }

      const response = await axios.post<AiChatTranscriptionResponse>(
        buildApiUrl('ai/chat/transcriptions'),
        formData,
      )
      return response.data
    } catch (error: unknown) {
      this.handleError(error, 'ai.transcription.createFailed')
      throw error
    }
  }

  static async streamMessage(
    payload: CreateAiChatMessagePayload,
    onEvent: (event: AiChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch(buildApiUrl('ai/chat/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(this.withClientTimeContext(payload)),
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

  private static withClientTimeContext<
    T extends {
      clientCurrentDateTime?: string
      clientTimeZone?: string
      clientLocale?: string
      clientUtcOffsetMinutes?: number
    },
  >(payload: T): T {
    const now = new Date()
    const resolvedOptions = Intl.DateTimeFormat().resolvedOptions()
    const timeZone = resolvedOptions.timeZone?.trim()
    const locale = navigator.language || resolvedOptions.locale

    return {
      ...payload,
      clientCurrentDateTime: now.toISOString(),
      clientTimeZone: timeZone || undefined,
      clientLocale: locale || undefined,
      clientUtcOffsetMinutes: -now.getTimezoneOffset(),
    }
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
