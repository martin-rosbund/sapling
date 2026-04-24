import { GoogleGenerativeAI } from '@google/generative-ai';
import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';

type TicketSearchEmbeddingResult = {
  values: number[];
  model: string;
  version: number;
};

@Injectable()
export class TicketSearchEmbeddingService {
  private readonly embeddingVersion = 1;
  private readonly syncEmbeddingsEnabled =
    process.env.TICKET_SEARCH_SYNC_EMBEDDINGS?.trim().toLowerCase() ===
      'true' || process.env.TICKET_SEARCH_SYNC_EMBEDDINGS === '1';
  private readonly preferredProviderHandle =
    process.env.TICKET_SEARCH_EMBED_PROVIDER?.trim().toLowerCase() || null;
  private readonly openAiEmbeddingModel =
    process.env.TICKET_SEARCH_OPENAI_EMBED_MODEL?.trim() ||
    'text-embedding-3-small';
  private readonly geminiEmbeddingModel =
    process.env.TICKET_SEARCH_GEMINI_EMBED_MODEL?.trim() ||
    'gemini-embedding-001';
  private readonly supportedModels: Record<string, string[]> = {
    openai: ['text-embedding-3-small', 'text-embedding-3-large'],
    gemini: ['gemini-embedding-001'],
  };

  constructor(private readonly em: EntityManager) {}

  shouldGenerateSyncEmbeddings(): boolean {
    return this.syncEmbeddingsEnabled;
  }

  async embedDocument(
    text: string,
    options?: {
      providerHandle?: string | null;
      model?: string | null;
    },
  ): Promise<TicketSearchEmbeddingResult | null> {
    return this.embedText(text, options);
  }

  async embedQuery(
    text: string,
    options?: {
      providerHandle?: string | null;
      model?: string | null;
    },
  ): Promise<number[] | null> {
    const result = await this.embedText(text, options);
    return result?.values ?? null;
  }

  private async embedText(
    text: string,
    options?: {
      providerHandle?: string | null;
      model?: string | null;
    },
  ): Promise<TicketSearchEmbeddingResult | null> {
    const normalizedText = text.trim();

    if (!normalizedText) {
      return null;
    }

    const provider = await this.resolveEmbeddingProvider(options?.providerHandle);

    if (!provider) {
      return null;
    }

    const model = this.resolveEmbeddingModel(
      provider.handle,
      options?.model,
    );

    if (!model) {
      return null;
    }

    if (provider.handle === 'gemini') {
      return this.embedWithGemini(provider, normalizedText, model);
    }

    return this.embedWithOpenAi(provider, normalizedText, model);
  }

  private async resolveEmbeddingProvider(
    requestedProviderHandle?: string | null,
  ): Promise<AiProviderTypeItem | null> {
    const normalizedRequestedHandle =
      requestedProviderHandle?.trim().toLowerCase() || null;
    const candidateHandles = normalizedRequestedHandle
      ? [normalizedRequestedHandle]
      : this.preferredProviderHandle
        ? [this.preferredProviderHandle]
        : ['openai', 'gemini'];

    for (const handle of candidateHandles) {
      const provider = await this.em.findOne(AiProviderTypeItem, {
        handle,
        isActive: true,
      });

      if (provider && this.hasUsableProviderCredentials(provider)) {
        return provider;
      }
    }

    return null;
  }

  private resolveEmbeddingModel(
    providerHandle: string,
    requestedModel?: string | null,
  ): string | null {
    const models = this.supportedModels[providerHandle] ?? [];
    const normalizedRequestedModel = requestedModel?.trim() || null;

    if (normalizedRequestedModel) {
      return models.find((model) => model === normalizedRequestedModel) ?? null;
    }

    if (providerHandle === 'openai') {
      return models.find((model) => model === this.openAiEmbeddingModel) ?? models[0] ?? null;
    }

    return models.find((model) => model === this.geminiEmbeddingModel) ?? models[0] ?? null;
  }

  private async embedWithOpenAi(
    provider: AiProviderTypeItem,
    text: string,
    model: string,
  ): Promise<TicketSearchEmbeddingResult | null> {
    const apiKey = this.getProviderCredential(provider, 'openAiApiKey');

    if (!apiKey) {
      return null;
    }

    const client = new OpenAI({ apiKey });
    const response = await client.embeddings.create({
      model,
      input: text,
    });
    const values = response.data[0]?.embedding;

    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }

    return {
      values: this.normalizeEmbedding(values),
      model,
      version: this.embeddingVersion,
    };
  }

  private async embedWithGemini(
    provider: AiProviderTypeItem,
    text: string,
    model: string,
  ): Promise<TicketSearchEmbeddingResult | null> {
    const apiKey = this.getProviderCredential(provider, 'geminiApiKey');

    if (!apiKey) {
      return null;
    }

    const client = new GoogleGenerativeAI(apiKey);
    const embeddingModel = client.getGenerativeModel({
      model,
    });
    const response = await embeddingModel.embedContent(text);
    const values = response.embedding?.values;

    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }

    return {
      values: this.normalizeEmbedding(values),
      model,
      version: this.embeddingVersion,
    };
  }

  private normalizeEmbedding(values: number[]): number[] {
    const magnitude = Math.sqrt(
      values.reduce((sum, value) => sum + value * value, 0),
    );

    if (!Number.isFinite(magnitude) || magnitude === 0) {
      return values;
    }

    return values.map((value) => value / magnitude);
  }

  private getProviderCredential(
    provider: AiProviderTypeItem,
    key: string,
  ): string | null {
    const credentials = provider.credentials;

    if (!credentials || typeof credentials !== 'object') {
      return null;
    }

    const value = credentials[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private hasUsableProviderCredentials(provider?: AiProviderTypeItem | null) {
    if (!provider) {
      return false;
    }

    if (provider.handle === 'gemini') {
      return this.getProviderCredential(provider, 'geminiApiKey') != null;
    }

    return this.getProviderCredential(provider, 'openAiApiKey') != null;
  }
}
