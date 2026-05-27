import { describe, expect, it, jest } from '@jest/globals';

jest.mock('openai', () => ({
  OpenAI: class {},
  toFile: jest.fn(),
}));
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {},
  TaskType: {},
}));

import {
  hasUsableProviderCredentials,
  resolveProviderKind,
} from './ai-provider.utils';

describe('ai-provider.utils', () => {
  it('resolves local OpenAI-compatible providers', () => {
    expect(resolveProviderKind('lmstudio')).toBe('openaiCompatible');
    expect(resolveProviderKind('LMStudio')).toBe('openaiCompatible');
    expect(resolveProviderKind('ollama')).toBe('openaiCompatible');
    expect(resolveProviderKind('Ollama')).toBe('openaiCompatible');
    expect(resolveProviderKind('gemini')).toBe('gemini');
    expect(resolveProviderKind('openai')).toBe('openai');
  });

  it('accepts an LM Studio base URL as usable provider configuration', () => {
    expect(
      hasUsableProviderCredentials({
        handle: 'lmstudio',
        credentials: {
          lmStudioBaseUrl: 'http://127.0.0.1:1234/v1',
        },
      } as never),
    ).toBe(true);
  });

  it('does not treat an LM Studio provider without a base URL as configured', () => {
    expect(
      hasUsableProviderCredentials({
        handle: 'lmstudio',
        credentials: null,
      } as never),
    ).toBe(false);
  });

  it('accepts an Ollama base URL as usable provider configuration', () => {
    expect(
      hasUsableProviderCredentials({
        handle: 'ollama',
        credentials: {
          ollamaBaseUrl: 'http://127.0.0.1:11434/v1',
        },
      } as never),
    ).toBe(true);
  });
});
