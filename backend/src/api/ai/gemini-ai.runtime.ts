import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { AiEmbeddingPurpose } from './ai.types';

const GEMINI_API_KEY_CREDENTIAL = 'geminiApiKey';

export function createGeminiClient(
  provider: AiProviderTypeItem,
): GoogleGenerativeAI {
  const apiKey = getGeminiApiKey(provider);

  if (!apiKey) {
    throw new Error('ai.providerNotConfigured');
  }

  return new GoogleGenerativeAI(apiKey);
}

export function getGeminiApiKey(provider: AiProviderTypeItem): string | null {
  return getProviderCredential(provider, GEMINI_API_KEY_CREDENTIAL);
}

export function hasGeminiCredentials(provider: AiProviderTypeItem): boolean {
  return getGeminiApiKey(provider) != null;
}

export async function embedGeminiTexts(options: {
  provider: AiProviderTypeItem;
  model: string;
  texts: string[];
  purpose: AiEmbeddingPurpose;
}): Promise<number[][]> {
  const model = createGeminiClient(options.provider).getGenerativeModel({
    model: options.model,
  });

  if (options.texts.length === 1) {
    const response = await model.embedContent(
      buildGeminiEmbeddingRequest(options.texts[0], options.purpose),
    );

    return [response.embedding.values];
  }

  const response = await model.batchEmbedContents({
    requests: options.texts.map((text) =>
      buildGeminiEmbeddingRequest(text, options.purpose),
    ),
  });

  return response.embeddings.map((item) => item.values);
}

function buildGeminiEmbeddingRequest(
  text: string,
  purpose: AiEmbeddingPurpose,
) {
  return {
    content: {
      role: 'user',
      parts: [{ text }],
    },
    taskType:
      purpose === 'query'
        ? TaskType.RETRIEVAL_QUERY
        : TaskType.RETRIEVAL_DOCUMENT,
  };
}

function getProviderCredential(
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
