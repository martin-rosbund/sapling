import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@google/generative-ai', () => ({
  SchemaType: {
    ARRAY: 'array',
    BOOLEAN: 'boolean',
    INTEGER: 'integer',
    NUMBER: 'number',
    OBJECT: 'object',
    STRING: 'string',
  },
}));
jest.mock('./gemini-ai.runtime', () => ({
  createGeminiClient: jest.fn(),
}));
jest.mock('./openai-ai.runtime', () => ({
  createOpenAiClient: jest.fn(),
}));
jest.mock('./mcp.service', () => ({
  McpService: class {},
}));

import { AiChatRuntimeService } from './ai-chat-runtime.service';
import { createOpenAiClient } from './openai-ai.runtime';

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('AiChatRuntimeService', () => {
  beforeEach(() => {
    asMock(createOpenAiClient).mockReset();
  });

  it('does not send OpenAI tool schemas when the selected model disables tools', async () => {
    const createCompletion = jest
      .fn<(payload: unknown) => Promise<unknown>>()
      .mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hallo lokal.',
            },
          },
        ],
      });
    asMock(createOpenAiClient).mockReturnValue({
      chat: {
        completions: {
          create: createCompletion,
        },
      },
    });
    const service = new AiChatRuntimeService({} as never);
    const onDelta = jest
      .fn<(delta: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    await service.streamOpenAi(
      [
        {
          role: 'user',
          status: 'persisted',
          content: 'Hallo',
          contextPayload: null,
        },
      ] as never,
      { handle: 'lmstudio' } as never,
      'openai/gpt-oss-20b',
      [
        {
          serverName: 'sapling',
          toolName: 'current_person',
          description: 'Read the current person.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ] as never,
      { handle: 1 } as never,
      1,
      undefined,
      onDelta,
      false,
    );

    const payload = asMock(createCompletion).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    const systemMessage = (payload.messages as Array<{ content: string }>)[0];

    expect(payload.tools).toBeUndefined();
    expect(payload.tool_choice).toBeUndefined();
    expect(systemMessage.content).not.toContain(
      'Use available tools automatically',
    );
    expect(onDelta).toHaveBeenCalledWith('Hallo lokal.');
  });
});
