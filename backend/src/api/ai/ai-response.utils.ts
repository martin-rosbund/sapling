import type { AiAgentItem } from '../../entity/AiAgentItem';
import type { AiAgentEvaluationItem } from '../../entity/AiAgentEvaluationItem';
import type { AiAgentMemoryItem } from '../../entity/AiAgentMemoryItem';
import type { AiAgentPlaybookItem } from '../../entity/AiAgentPlaybookItem';
import type { AiAgentRunItem } from '../../entity/AiAgentRunItem';
import type { AiAgentVersionItem } from '../../entity/AiAgentVersionItem';
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
  const playbooks = isInitializedCollection(agent.playbooks)
    ? agent.playbooks
        .getItems()
        .filter((playbook) => playbook.isActive)
        .map((playbook) => sanitizeAgentPlaybook(playbook))
    : undefined;

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
    playbooks,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  } as unknown as AiAgentItem;
}

function isInitializedCollection<T>(value: {
  isInitialized?: () => boolean;
  getItems?: () => T[];
}): value is { isInitialized: () => boolean; getItems: () => T[] } {
  return (
    typeof value?.isInitialized === 'function' &&
    typeof value?.getItems === 'function' &&
    value.isInitialized()
  );
}

export function sanitizeAgentVersion(
  version: AiAgentVersionItem,
): AiAgentVersionItem {
  return {
    handle: version.handle,
    agent:
      version.agent && typeof version.agent !== 'string'
        ? version.agent.handle
        : version.agent,
    version: version.version,
    status: version.status,
    promptMarkdown: version.promptMarkdown,
    changelog: version.changelog ?? null,
    provider:
      version.provider && typeof version.provider !== 'string'
        ? sanitizeProvider(version.provider)
        : version.provider,
    model:
      version.model && typeof version.model !== 'string'
        ? sanitizeModel(version.model)
        : version.model,
    allowedEntityHandles: version.allowedEntityHandles ?? null,
    allowedKnowledgeEntityHandles:
      version.allowedKnowledgeEntityHandles ?? null,
    allowedInternalTools: version.allowedInternalTools ?? null,
    allowedExternalTools: version.allowedExternalTools ?? null,
    activatedAt: version.activatedAt ?? null,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  } as unknown as AiAgentVersionItem;
}

export function sanitizeAgentPlaybook(
  playbook: AiAgentPlaybookItem,
): AiAgentPlaybookItem {
  return {
    handle: playbook.handle,
    agent:
      playbook.agent && typeof playbook.agent !== 'string'
        ? playbook.agent.handle
        : playbook.agent,
    title: playbook.title,
    description: playbook.description ?? null,
    triggerEntityHandles: playbook.triggerEntityHandles ?? null,
    steps: playbook.steps ?? [],
    expectedOutput: playbook.expectedOutput ?? null,
    isActive: playbook.isActive,
    sortOrder: playbook.sortOrder,
    createdAt: playbook.createdAt,
    updatedAt: playbook.updatedAt,
  } as unknown as AiAgentPlaybookItem;
}

export function sanitizeAgentMemory(
  memory: AiAgentMemoryItem,
): AiAgentMemoryItem {
  return {
    handle: memory.handle,
    agent:
      memory.agent && typeof memory.agent !== 'string'
        ? memory.agent.handle
        : memory.agent,
    type: memory.type,
    title: memory.title,
    contentMarkdown: memory.contentMarkdown,
    entityScopeHandles: memory.entityScopeHandles ?? null,
    isActive: memory.isActive,
    sortOrder: memory.sortOrder,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
  } as unknown as AiAgentMemoryItem;
}

export function sanitizeAgentRun(run: AiAgentRunItem): AiAgentRunItem {
  return {
    handle: run.handle,
    session:
      run.session && typeof run.session !== 'number'
        ? (run.session.handle ?? null)
        : (run.session ?? null),
    message:
      run.message && typeof run.message !== 'number'
        ? (run.message.handle ?? null)
        : (run.message ?? null),
    person: extractPersonReference(run.person),
    agent:
      run.agent && typeof run.agent !== 'string'
        ? sanitizeAgent(run.agent)
        : (run.agent ?? null),
    agentVersion:
      run.agentVersion && typeof run.agentVersion !== 'number'
        ? sanitizeAgentVersion(run.agentVersion)
        : (run.agentVersion ?? null),
    playbook:
      run.playbook && typeof run.playbook !== 'string'
        ? sanitizeAgentPlaybook(run.playbook)
        : (run.playbook ?? null),
    status: run.status,
    provider: run.provider ?? null,
    model: run.model ?? null,
    contextEntityHandle: run.contextEntityHandle ?? null,
    contextRecordHandle: run.contextRecordHandle ?? null,
    durationMs: run.durationMs ?? null,
    toolCalls: run.toolCalls ?? null,
    sources: run.sources ?? null,
    pendingActions: run.pendingActions ?? null,
    usagePayload: run.usagePayload ?? null,
    responseText: run.responseText ?? null,
    errorPayload: run.errorPayload ?? null,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
    updatedAt: run.updatedAt,
  } as unknown as AiAgentRunItem;
}

export function sanitizeAgentEvaluation(
  evaluation: AiAgentEvaluationItem,
): AiAgentEvaluationItem {
  return {
    handle: evaluation.handle,
    agent:
      evaluation.agent && typeof evaluation.agent !== 'string'
        ? evaluation.agent.handle
        : evaluation.agent,
    agentVersion:
      evaluation.agentVersion && typeof evaluation.agentVersion !== 'number'
        ? sanitizeAgentVersion(evaluation.agentVersion)
        : (evaluation.agentVersion ?? null),
    title: evaluation.title,
    prompt: evaluation.prompt,
    expectedCriteria: evaluation.expectedCriteria ?? null,
    targetEntityHandle: evaluation.targetEntityHandle ?? null,
    targetRecordHandle: evaluation.targetRecordHandle ?? null,
    status: evaluation.status,
    rating: evaluation.rating ?? null,
    comment: evaluation.comment ?? null,
    createdAt: evaluation.createdAt,
    updatedAt: evaluation.updatedAt,
  } as unknown as AiAgentEvaluationItem;
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
    agentVersion:
      session.agentVersion && typeof session.agentVersion !== 'number'
        ? sanitizeAgentVersion(session.agentVersion)
        : (session.agentVersion ?? null),
    playbook:
      session.playbook && typeof session.playbook !== 'string'
        ? sanitizeAgentPlaybook(session.playbook)
        : (session.playbook ?? null),
    contextEntityHandle: session.contextEntityHandle ?? null,
    contextRecordHandle: session.contextRecordHandle ?? null,
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
