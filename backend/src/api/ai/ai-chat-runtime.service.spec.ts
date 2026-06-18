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

  it('classifies schema repair tool responses without treating them as tool errors', async () => {
    const createCompletion = jest
      .fn<(payload: unknown) => Promise<unknown>>()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'sapling__generic_list',
                    arguments: JSON.stringify({
                      entityHandle: 'ticketStatus',
                      filter: { title: 'Offen' },
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Ich pruefe das Schema und versuche es erneut.',
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
    const repairPayload = {
      entityHandle: 'ticketStatus',
      queryExecuted: false,
      status: 'needs_schema_retry',
      invalidFields: [
        {
          entityHandle: 'ticketStatus',
          fieldPath: 'title',
          suggestedFields: ['description', 'handle'],
        },
      ],
      usageHints: ['Retry with description.'],
    };

    const result = await service.streamOpenAi(
      [
        {
          role: 'user',
          status: 'persisted',
          content: 'Zeig offene Ticket Status',
          contextPayload: null,
        },
      ] as never,
      { handle: 'openai' } as never,
      'gpt-5',
      [
        {
          serverHandle: 0,
          serverName: 'sapling',
          toolName: 'generic_list',
          description: 'List records.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ] as never,
      { handle: 1 } as never,
      3,
      undefined,
      onDelta,
      true,
      null,
      async (_entry, args) => ({
        serverHandle: 0,
        serverName: 'sapling',
        toolName: 'generic_list',
        arguments: args,
        content: JSON.stringify(repairPayload),
        modelResult: repairPayload,
        rawResult: repairPayload,
      }),
    );

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({
      serverName: 'sapling',
      toolName: 'generic_list',
      status: 'repair',
      resultCount: 0,
      sourceEntityHandles: ['ticketStatus'],
      repairHints: ['Retry with description.'],
    });
    expect(onDelta).toHaveBeenCalledWith(
      'Ich pruefe das Schema und versuche es erneut.',
    );
  });
});
