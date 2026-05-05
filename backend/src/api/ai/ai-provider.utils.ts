import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { hasGeminiCredentials } from './gemini-ai.runtime';
import { hasOpenAiCredentials } from './openai-ai.runtime';

export function resolveProviderKind(
  preferredProvider?: string | null,
): 'openai' | 'gemini' {
  return preferredProvider === 'gemini' ? 'gemini' : 'openai';
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

  return hasOpenAiCredentials(provider);
}
