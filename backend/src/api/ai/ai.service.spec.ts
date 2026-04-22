import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({ EntityManager: class {} }));
jest.mock('openai', () => ({ OpenAI: class {} }));
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {},
  SchemaType: {},
}));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/AiChatSessionItem', () => ({
  AiChatSessionItem: class {},
}));
jest.mock('../../entity/AiChatMessageItem', () => ({
  AiChatMessageItem: class {},
}));
jest.mock('../../entity/AiProviderTypeItem', () => ({
  AiProviderTypeItem: class {},
}));
jest.mock('../../entity/AiProviderModelItem', () => ({
  AiProviderModelItem: class {},
}));
jest.mock('./dto/chat.dto', () => ({
  AiChatMessageListMetaDto: class {},
  AiChatMessageListResponseDto: class {},
  CreateAiChatMessageDto: class {},
  CreateAiChatSessionDto: class {},
  ListAiChatMessagesQueryDto: class {},
  UpdateAiChatSessionDto: class {},
}));
jest.mock('./mcp.service', () => ({ McpService: class {} }));

import { AiService } from './ai.service';

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('AiService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T08:15:30.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('includes the current server date in the system instruction', () => {
    const service = new AiService({} as never, {} as never);

    const instruction = (
      service as never as {
        buildSystemInstruction: (options?: {
          includeToolGuidance?: boolean;
        }) => string;
      }
    ).buildSystemInstruction({ includeToolGuidance: true });

    expect(instruction).toContain(
      'Current server date and time: 2026-04-20T08:15:30.000Z.',
    );
    expect(instruction).toContain('Server local date: 2026-04-20.');
    expect(instruction).toContain(
      'Interpret relative date expressions such as "today", "yesterday", "this week", and "this month" using the server local date',
    );
    expect(instruction).toContain(
      'Use available tools automatically when they are needed to answer with current Sapling data.',
    );
  });

  it('returns only the latest message page in ascending order with pagination metadata', async () => {
    const em = {
      findOne: jest
        .fn<() => Promise<Record<string, unknown> | null>>()
        .mockResolvedValueOnce({
          handle: 5,
          person: { handle: 9 },
        })
        .mockResolvedValueOnce({
          handle: 5,
          person: { handle: 9 },
        }),
      find: jest.fn<() => Promise<Record<string, unknown>[]>>().mockResolvedValue([
        {
          handle: 105,
          person: { handle: 9 },
          session: { handle: 5 },
          role: 'assistant',
          status: 'completed',
          sequence: 105,
          content: 'Newest',
        },
        {
          handle: 104,
          person: { handle: 9 },
          session: { handle: 5 },
          role: 'user',
          status: 'completed',
          sequence: 104,
          content: 'Middle',
        },
        {
          handle: 103,
          person: { handle: 9 },
          session: { handle: 5 },
          role: 'assistant',
          status: 'completed',
          sequence: 103,
          content: 'Older',
        },
      ]),
    };
    const service = new AiService(em as never, {} as never);

    const result = await service.listChatMessages(
      5,
      { handle: 9 } as never,
      { limit: 2 } as never,
    );

    expect(asMock(em.find)).toHaveBeenCalledWith(
      expect.any(Function),
      {
        session: { handle: 5 },
        person: { handle: 9 },
      },
      {
        orderBy: { sequence: 'DESC' },
        limit: 3,
      },
    );
    expect(result.data.map((message) => message.sequence)).toEqual([104, 105]);
    expect(result.meta).toEqual({
      limit: 2,
      hasMore: true,
      nextBeforeSequence: 104,
    });
  });

  it('loads only the most recent stream history window', async () => {
    const em = {
      find: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    };
    const service = new AiService(em as never, {} as never);

    await (
      service as never as {
        loadSessionHistory: (
          sessionHandle: number,
          userHandle: number,
        ) => Promise<unknown>;
      }
    ).loadSessionHistory(7, 11);

    expect(asMock(em.find)).toHaveBeenCalledWith(
      expect.any(Function),
      {
        session: { handle: 7 },
        person: { handle: 11 },
      },
      {
        orderBy: { sequence: 'DESC' },
        limit: 25,
      },
    );
  });
});
