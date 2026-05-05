import type { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { McpToolDescriptor } from './mcp.service';

export type AiExecutedToolCall = {
  serverHandle: number;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  rawResult: unknown;
};

export type AiToolErrorPayload = {
  ok: false;
  toolName?: string;
  error?: string;
  hints?: string[];
};

export type AiChatNavigationLink = {
  path: string;
  entityHandle: string;
  kind: 'list' | 'record' | 'route';
};

export type AiStreamResult = {
  toolCalls: AiExecutedToolCall[];
};

export type AiToolRegistryEntry = {
  encodedName: string;
  descriptor: McpToolDescriptor;
};

export type AiProviderCapability = 'chat' | 'embedding' | 'transcription';

export type AiEmbeddingPurpose = 'document' | 'query';

export type AiClientTimeContext = {
  currentDate?: Date;
  timeZone?: string;
  locale?: string;
  utcOffsetMinutes?: number;
};

export type AiChatMessageSpeechPayload = {
  status: 'completed' | 'failed';
  providerHandle: string | null;
  model: string | null;
  voice: string | null;
  speed: number | null;
  documentHandle: number | null;
  mimeType: string | null;
  filename: string | null;
  sourceTextLength: number | null;
  wasTruncated: boolean;
  generatedAt: string;
  error?: string | null;
};

export type AiPreparedSpeechText = {
  text: string;
  sourceTextLength: number;
  wasTruncated: boolean;
};

export type AiEmbeddingTarget = {
  provider: AiProviderTypeItem;
  model: AiProviderModelItem;
  providerKind: 'openai' | 'gemini';
};

export type AiVectorDocumentDraft = {
  sourceRecordHandle: string;
  sourceSection: string;
  chunkIndex: number;
  title: string | null;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown> | null;
};

export type AiVectorDocumentRow = {
  handle: number;
  source_record_handle: string;
  source_section: string;
  chunk_index: number;
  title: string | null;
  content: string;
  content_hash: string;
  metadata: Record<string, unknown> | null;
  provider_handle: string;
  model_handle: string;
  embedding_dimensions: number;
};

export type AiVectorIndexRow = {
  provider_handle: string;
  model_handle: string;
  document_count: number | string;
};
