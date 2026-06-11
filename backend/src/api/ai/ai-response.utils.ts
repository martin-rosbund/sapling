import type { AiAgentItem } from '../../entity/AiAgentItem';
import type { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import type { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import type { AiChatToolActionItem } from '../../entity/AiChatToolActionItem';
import type { AiChatTranscriptionItem } from '../../entity/AiChatTranscriptionItem';
import type { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { PersonItem } from '../../entity/PersonItem';
import type { AiChatTranscriptionResponseDto } from './dto/transcription.dto';
import type {
  AiChatMessageSpeechDescriptor,
  AiChatMessageSpeechPayload,
  AiSpeechTarget,
} from './ai.types';

export function buildAssistantSpeechDescriptor(
  target: AiSpeechTarget | null,
): AiChatMessageSpeechDescriptor {
  return {
    providerHandle: target?.provider.handle ?? null,
    model: target?.model.providerModel ?? null,
    voice: target?.voice ?? null,
    speed: target?.speed ?? null,
  };
}

export function shouldReuseAssistantSpeech(
  payload: AiChatMessageSpeechPayload | null,
  descriptor: AiChatMessageSpeechDescriptor | null,
): boolean {
  if (!payload) {
    return false;
  }

  if (!descriptor) {
    return payload.status === 'completed' && payload.documentHandle != null;
  }

  return (
    payload.status === 'completed' &&
    payload.documentHandle != null &&
    payload.providerHandle === descriptor.providerHandle &&
    payload.model === descriptor.model &&
    payload.voice === descriptor.voice &&
    payload.speed === descriptor.speed
  );
}

export function withMessageSpeechPayload(
  responsePayload: object | null | undefined,
  speechPayload: AiChatMessageSpeechPayload,
): Record<string, unknown> {
  const normalizedResponsePayload = normalizeRecord(responsePayload);

  return {
    ...normalizedResponsePayload,
    speech: speechPayload,
  };
}

export function extractMessageSpeechPayload(
  responsePayload: object | null | undefined,
): AiChatMessageSpeechPayload | null {
  const normalizedResponsePayload = normalizeRecord(responsePayload);
  const speechPayload = normalizeRecord(normalizedResponsePayload?.speech);

  if (!speechPayload) {
    return null;
  }

  return {
    status: speechPayload.status === 'failed' ? 'failed' : 'completed',
    providerHandle:
      typeof speechPayload.providerHandle === 'string'
        ? speechPayload.providerHandle
        : null,
    model: typeof speechPayload.model === 'string' ? speechPayload.model : null,
    voice: typeof speechPayload.voice === 'string' ? speechPayload.voice : null,
    speed: typeof speechPayload.speed === 'number' ? speechPayload.speed : null,
    documentHandle:
      typeof speechPayload.documentHandle === 'number'
        ? speechPayload.documentHandle
        : null,
    mimeType:
      typeof speechPayload.mimeType === 'string'
        ? speechPayload.mimeType
        : null,
    filename:
      typeof speechPayload.filename === 'string'
        ? speechPayload.filename
        : null,
    sourceTextLength:
      typeof speechPayload.sourceTextLength === 'number'
        ? speechPayload.sourceTextLength
        : null,
    wasTruncated: speechPayload.wasTruncated === true,
    generatedAt:
      typeof speechPayload.generatedAt === 'string'
        ? speechPayload.generatedAt
        : new Date().toISOString(),
    error: typeof speechPayload.error === 'string' ? speechPayload.error : null,
  };
}

export function extractProviderHandle(
  provider?: AiProviderTypeItem | string | null,
): string | null {
  if (!provider) {
    return null;
  }

  if (typeof provider === 'string') {
    return provider;
  }

  return provider.handle ?? null;
}

export function extractModelHandle(
  model?: AiProviderModelItem | string | null,
): string | null {
  if (!model) {
    return null;
  }

  if (typeof model === 'string') {
    return model;
  }

  return model.handle ?? null;
}

export function extractPersonReference(
  person?: PersonItem | number | null,
): PersonItem | number {
  if (typeof person === 'number') {
    return person;
  }

  if (person?.handle != null) {
    return person.handle;
  }

  return 0;
}

export function sanitizeProvider(
  provider: AiProviderTypeItem,
): AiProviderTypeItem {
  return {
    handle: provider.handle,
    title: provider.title,
    icon: provider.icon,
    color: provider.color,
    credentialTypes: provider.credentialTypes,
    isActive: provider.isActive,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    credentials: undefined,
  } as AiProviderTypeItem;
}

export function sanitizeModel(model: AiProviderModelItem): AiProviderModelItem {
  return {
    handle: model.handle,
    title: model.title,
    description: model.description,
    provider:
      model.provider && typeof model.provider !== 'string'
        ? sanitizeProvider(model.provider)
        : model.provider,
    providerModel: model.providerModel,
    supportsStreaming: model.supportsStreaming,
    supportsTools: model.supportsTools,
    supportsEmbeddings: model.supportsEmbeddings,
    supportsTranscription: model.supportsTranscription,
    embeddingBatchSize: model.embeddingBatchSize,
    vectorChunkLength: model.vectorChunkLength,
    vectorChunkOverlap: model.vectorChunkOverlap,
    vectorSearchCandidateMultiplier: model.vectorSearchCandidateMultiplier,
    vectorSearchMaxCandidateLimit: model.vectorSearchMaxCandidateLimit,
    vectorSearchMaxResults: model.vectorSearchMaxResults,
    supportsSpeech: model.supportsSpeech,
    speechVoice: model.speechVoice,
    speechSpeed: model.speechSpeed,
    speechMimeType: model.speechMimeType,
    speechFileExtension: model.speechFileExtension,
    speechMaxInputLength: model.speechMaxInputLength,
    maxToolCallIterations: model.maxToolCallIterations,
    isDefault: model.isDefault,
    isActive: model.isActive,
    sortOrder: model.sortOrder,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  } as AiProviderModelItem;
}

export function sanitizeAgent(agent: AiAgentItem): AiAgentItem {
  return {
    handle: agent.handle,
    title: agent.title,
    description: agent.description ?? null,
    icon: agent.icon ?? null,
    color: agent.color ?? null,
    promptMarkdown: agent.promptMarkdown,
    welcomeMessage: agent.welcomeMessage ?? null,
    conversationStarters: agent.conversationStarters ?? null,
    provider:
      agent.provider && typeof agent.provider !== 'string'
        ? sanitizeProvider(agent.provider)
        : agent.provider,
    model:
      agent.model && typeof agent.model !== 'string'
        ? sanitizeModel(agent.model)
        : agent.model,
    allowedEntityHandles: agent.allowedEntityHandles ?? null,
    allowedKnowledgeEntityHandles: agent.allowedKnowledgeEntityHandles ?? null,
    allowedInternalTools: agent.allowedInternalTools ?? null,
    allowedExternalTools: agent.allowedExternalTools ?? null,
    mutationMode: agent.mutationMode,
    isActive: agent.isActive,
    isDefault: agent.isDefault,
    sortOrder: agent.sortOrder,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  } as AiAgentItem;
}

export function sanitizeChatSession(
  session: AiChatSessionItem,
): AiChatSessionItem {
  return {
    handle: session.handle,
    title: session.title,
    isArchived: session.isArchived,
    provider:
      session.provider && typeof session.provider !== 'string'
        ? sanitizeProvider(session.provider)
        : session.provider,
    model:
      session.model && typeof session.model !== 'string'
        ? sanitizeModel(session.model)
        : session.model,
    agent:
      session.agent && typeof session.agent !== 'string'
        ? sanitizeAgent(session.agent)
        : session.agent,
    lastMessageAt: session.lastMessageAt,
    person: extractPersonReference(session.person),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  } as AiChatSessionItem;
}

export function sanitizeToolAction(
  action: AiChatToolActionItem,
): AiChatToolActionItem {
  return {
    handle: action.handle,
    session:
      action.session && typeof action.session !== 'number'
        ? (action.session.handle ?? 0)
        : action.session,
    message:
      action.message && typeof action.message !== 'number'
        ? (action.message.handle ?? null)
        : (action.message ?? null),
    person: extractPersonReference(action.person),
    agent:
      action.agent && typeof action.agent !== 'string'
        ? sanitizeAgent(action.agent)
        : (action.agent ?? null),
    serverName: action.serverName,
    toolName: action.toolName,
    arguments: action.arguments ?? null,
    status: action.status,
    resultPayload: action.resultPayload ?? null,
    errorPayload: action.errorPayload ?? null,
    expiresAt: action.expiresAt ?? null,
    executedAt: action.executedAt ?? null,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  } as unknown as AiChatToolActionItem;
}

export function buildTranscriptionResponse(
  transcription: AiChatTranscriptionItem,
): AiChatTranscriptionResponseDto {
  return {
    transcriptionHandle: transcription.handle ?? 0,
    transcript: transcription.transcript ?? null,
    detectedLanguage: transcription.detectedLanguage ?? null,
    durationSeconds: transcription.durationSeconds ?? null,
    status: transcription.status,
    providerHandle: extractProviderHandle(transcription.provider),
    modelHandle: extractModelHandle(transcription.model),
    documentHandle:
      transcription.document && typeof transcription.document === 'object'
        ? (transcription.document.handle ?? null)
        : null,
  };
}

export function sanitizeChatMessage(
  message: AiChatMessageItem,
): AiChatMessageItem {
  return {
    handle: message.handle,
    session:
      message.session && typeof message.session !== 'number'
        ? (message.session.handle ?? 0)
        : message.session,
    person: extractPersonReference(message.person),
    role: message.role,
    status: message.status,
    sequence: message.sequence,
    content: message.content,
    contextPayload: message.contextPayload ?? null,
    toolCalls: message.toolCalls ?? null,
    requestPayload: message.requestPayload ?? null,
    responsePayload: message.responsePayload ?? null,
    provider: message.provider ?? null,
    model: message.model ?? null,
    url: message.url ?? null,
    routeName: message.routeName ?? null,
    pageTitle: message.pageTitle ?? null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  } as unknown as AiChatMessageItem;
}

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
