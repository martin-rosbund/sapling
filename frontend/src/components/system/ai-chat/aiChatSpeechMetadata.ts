import type { AiChatMessageItem, AiProviderModelItem } from '@/entity/entity'
import { getModelProviderHandle } from './aiChatRuntimeTargets'

export interface AssistantSpeechMetadata {
  status: string
  providerHandle: string | null
  model: string | null
  voice: string | null
  speed: number | null
  documentHandle: number | null
  mimeType: string | null
  filename: string | null
  sourceTextLength: number | null
  wasTruncated: boolean
  generatedAt: string | null
  error: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export function getMessageSpeechMetadata(
  message?: AiChatMessageItem | null,
): AssistantSpeechMetadata | null {
  const responsePayload = asRecord(message?.responsePayload)
  const speechPayload = asRecord(responsePayload?.speech)

  if (!speechPayload) {
    return null
  }

  return {
    status: typeof speechPayload.status === 'string' ? speechPayload.status : 'completed',
    providerHandle:
      typeof speechPayload.providerHandle === 'string' ? speechPayload.providerHandle : null,
    model: typeof speechPayload.model === 'string' ? speechPayload.model : null,
    voice: typeof speechPayload.voice === 'string' ? speechPayload.voice : null,
    speed: typeof speechPayload.speed === 'number' ? speechPayload.speed : null,
    documentHandle:
      typeof speechPayload.documentHandle === 'number' ? speechPayload.documentHandle : null,
    mimeType: typeof speechPayload.mimeType === 'string' ? speechPayload.mimeType : null,
    filename: typeof speechPayload.filename === 'string' ? speechPayload.filename : null,
    sourceTextLength:
      typeof speechPayload.sourceTextLength === 'number' ? speechPayload.sourceTextLength : null,
    wasTruncated: speechPayload.wasTruncated === true,
    generatedAt: typeof speechPayload.generatedAt === 'string' ? speechPayload.generatedAt : null,
    error: typeof speechPayload.error === 'string' ? speechPayload.error : null,
  }
}

export function doesSpeechMetadataMatchSelection(
  metadata: AssistantSpeechMetadata | null,
  selectedModel: AiProviderModelItem | null,
  selectedProviderHandle: string | null,
) {
  const resolvedProviderHandle = getModelProviderHandle(selectedModel) ?? selectedProviderHandle

  if (!metadata || metadata.status !== 'completed' || metadata.documentHandle == null) {
    return false
  }

  if (!selectedModel) {
    return true
  }

  return (
    metadata.providerHandle === resolvedProviderHandle &&
    metadata.model === selectedModel.providerModel &&
    metadata.voice === selectedModel.speechVoice &&
    metadata.speed === selectedModel.speechSpeed
  )
}
