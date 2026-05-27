import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { AiProviderKind } from './ai.types';
import { hasGeminiCredentials } from './gemini-ai.runtime';
import {
  hasOpenAiCompatibleCredentials,
  hasOpenAiCredentials,
} from './openai-ai.runtime';

export function resolveProviderKind(
  preferredProvider?: string | null,
): AiProviderKind {
  const normalizedProvider = preferredProvider?.trim().toLowerCase();

  if (normalizedProvider === 'gemini') {
    return 'gemini';
  }

  if (normalizedProvider === 'lmstudio') {
    return 'openaiCompatible';
  }

  return 'openai';
}

export function hasUsableProviderCredentials(
  provider?: AiProviderTypeItem | null,
): boolean {
  if (!provider) {
    return false;
  }

  if (provider.handle === 'gemini') {
    return hasGeminiCredentials(provider);
  }

  if (resolveProviderKind(provider.handle) === 'openaiCompatible') {
    return hasOpenAiCompatibleCredentials(provider);
  }

  return hasOpenAiCredentials(provider);
}
