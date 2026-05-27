import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation((options: unknown) => ({ options })),
  toFile: jest.fn(),
}));

import { OpenAI } from 'openai';
import {
  createOpenAiClient,
  getOpenAiBaseUrl,
  hasOpenAiCompatibleCredentials,
} from './openai-ai.runtime';

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('openai-ai.runtime', () => {
  beforeEach(() => {
    asMock(OpenAI).mockClear();
  });

  it('creates an OpenAI-compatible client for LM Studio with a local base URL', () => {
    const client = createOpenAiClient({
      handle: 'lmstudio',
      credentials: {
        lmStudioBaseUrl: 'http://127.0.0.1:1234/v1/',
      },
    } as never);

    expect(client).toEqual({
      options: {
        apiKey: 'sapling-local',
        baseURL: 'http://127.0.0.1:1234/v1',
      },
    });
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'sapling-local',
      baseURL: 'http://127.0.0.1:1234/v1',
    });
  });

  it('detects OpenAI-compatible credentials independently from the official API key', () => {
    const provider = {
      handle: 'lmstudio',
      credentials: {
        lmStudioBaseUrl: 'http://127.0.0.1:1234/v1',
      },
    } as never;

    expect(getOpenAiBaseUrl(provider)).toBe('http://127.0.0.1:1234/v1');
    expect(hasOpenAiCompatibleCredentials(provider)).toBe(true);
  });

  it('creates an OpenAI-compatible client for Ollama with a local base URL', () => {
    const client = createOpenAiClient({
      handle: 'ollama',
      credentials: {
        ollamaBaseUrl: 'http://127.0.0.1:11434/v1/',
      },
    } as never);

    expect(client).toEqual({
      options: {
        apiKey: 'sapling-local',
        baseURL: 'http://127.0.0.1:11434/v1',
      },
    });
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'sapling-local',
      baseURL: 'http://127.0.0.1:11434/v1',
    });
  });
});
