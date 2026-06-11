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
  TaskType: {},
}));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/TicketItem', () => ({ TicketItem: class {} }));
jest.mock('../../entity/AiChatSessionItem', () => ({
  AiChatSessionItem: class {},
}));
jest.mock('../../entity/AiChatMessageItem', () => ({
  AiChatMessageItem: class {},
}));
jest.mock('../../entity/AiChatAttachmentItem', () => ({
  AiChatAttachmentItem: class {},
}));
jest.mock('../../entity/AiChatTranscriptionItem', () => ({
  AiChatTranscriptionItem: class {},
}));
jest.mock('../../entity/AiAgentItem', () => ({
  AiAgentItem: class {},
}));
jest.mock('../../entity/AiAgentVersionItem', () => ({
  AiAgentVersionItem: class {},
}));
jest.mock('../../entity/AiAgentRunItem', () => ({
  AiAgentRunItem: class {},
}));
jest.mock('../../entity/AiAgentEvaluationItem', () => ({
  AiAgentEvaluationItem: class {},
}));
jest.mock('../../entity/AiAgentPlaybookItem', () => ({
  AiAgentPlaybookItem: class {},
}));
jest.mock('../../entity/AiAgentMemoryItem', () => ({
  AiAgentMemoryItem: class {},
}));
jest.mock('../../entity/AiChatToolActionItem', () => ({
  AiChatToolActionItem: class {},
}));
jest.mock('../../entity/AiProviderTypeItem', () => ({
  AiProviderTypeItem: class {},
}));
jest.mock('../../entity/AiProviderModelItem', () => ({
  AiProviderModelItem: class {},
}));
jest.mock('../../entity/DocumentItem', () => ({ DocumentItem: class {} }));
jest.mock('../../entity/ImportBatchItem', () => ({
  ImportBatchItem: class {},
}));
jest.mock('./dto/chat.dto', () => ({
  AiChatMessageListMetaDto: class {},
  AiChatMessageListResponseDto: class {},
  ApplyAiChatSessionPlaybookDto: class {},
  CreateAiAgentEvaluationDto: class {},
  CreateAiAgentTestRunDto: class {},
  CreateAiChatMessageDto: class {},
  CreateAiChatSessionDto: class {},
  ListAiChatMessagesQueryDto: class {},
  UpdateAiChatSessionDto: class {},
}));
jest.mock('./dto/vectorization.dto', () => ({
  VectorizeEntityDto: class {},
  VectorizeEntityResponseDto: class {},
}));
jest.mock('./dto/transcription.dto', () => ({
  AiChatTranscriptionResponseDto: class {},
  CreateAiChatTranscriptionDto: class {},
}));
jest.mock('./mcp.service', () => ({ McpService: class {} }));
jest.mock('../document/document.service', () => ({
  DocumentService: class {},
}));
jest.mock('../generic/generic.service', () => ({ GenericService: class {} }));
jest.mock('./ai-provider-registry.service', () => ({
  AiProviderRegistryService: class {},
}));
jest.mock('./ai-vector.service', () => ({ AiVectorService: class {} }));
jest.mock('../import/import.service', () => ({ ImportService: class {} }));

import { AiService } from './ai.service';
import { AiChatRuntimeService } from './ai-chat-runtime.service';
import {
  alignAssistantContentWithNavigationLinks,
  buildNavigationLink,
} from './ai-navigation.utils';

type ExecuteToolResult = {
  serverHandle: number;
  serverName: string;
  toolName: string;
  content: string;
  modelResult?: Record<string, unknown>;
  rawResult: Record<string, unknown>;
};

type ExecuteToolMock = (
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
  user: unknown,
) => Promise<ExecuteToolResult>;

const asMock = (value: unknown): jest.Mock => value as jest.Mock;
const createService = (
  em: unknown = {},
  mcpService: unknown = {},
  documentService: unknown = {},
  providerRegistry: unknown = {},
  vectorService: unknown = {},
  chatRuntime: unknown = new AiChatRuntimeService(mcpService as never),
  agentPolicy: unknown = {},
  importService: unknown = {},
) =>
  new AiService(
    em as never,
    mcpService as never,
    documentService as never,
    providerRegistry as never,
    vectorService as never,
    chatRuntime as never,
    agentPolicy as never,
    importService as never,
  );

describe('AiService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T08:15:30.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('includes the current server date in the system instruction', () => {
    const service = createService();

    const instruction = (
      service as never as {
        buildSystemInstruction: (options?: {
          includeToolGuidance?: boolean;
          user?: unknown;
          clientTimeContext?: unknown;
        }) => string;
      }
    ).buildSystemInstruction({ includeToolGuidance: true });

    expect(instruction).toContain(
      'Current UTC date and time: 2026-04-20T08:15:30.000Z.',
    );
    expect(instruction).toContain('Server local date: 2026-04-20.');
    expect(instruction).toContain(
      'Interpret relative date expressions such as "today", "yesterday", "this week", and "this month" using the',
    );
    expect(instruction).toContain(
      'Use available tools automatically when they are needed to answer with current Sapling data.',
    );
  });

  it('uses the client timezone context for local date and time instructions', () => {
    const service = createService();

    const instruction = (
      service as never as {
        buildSystemInstruction: (options?: {
          includeToolGuidance?: boolean;
          user?: unknown;
          clientTimeContext?: unknown;
        }) => string;
      }
    ).buildSystemInstruction({
      clientTimeContext: {
        currentDate: new Date('2026-04-20T08:15:30.000Z'),
        timeZone: 'Europe/Berlin',
        locale: 'de-DE',
        utcOffsetMinutes: 120,
      },
    });

    expect(instruction).toContain(
      'Client reported current date and time: 2026-04-20T08:15:30.000Z.',
    );
    expect(instruction).toContain(
      'Client reported timezone offset at request time: UTC+02:00.',
    );
    expect(instruction).toContain('UTC+02:00 (Europe/Berlin).');
    expect(instruction).toContain('using the Europe/Berlin user locale date');
    expect(instruction).toContain(
      'use 20:00 Europe/Berlin rather than 20:00 UTC unless UTC is explicitly requested',
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
      find: jest
        .fn<() => Promise<Record<string, unknown>[]>>()
        .mockResolvedValue([
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
    const service = createService(em);

    const result = await service.listChatMessages(5, { handle: 9 } as never, {
      limit: 2,
    });

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
    const service = createService(em);

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

  it('builds record navigation links for generic_get results', () => {
    const link = buildNavigationLink({
      serverHandle: 0,
      serverName: 'sapling',
      toolName: 'generic_get',
      arguments: {
        entityHandle: 'project',
        handle: 11,
      },
      rawResult: {
        entityHandle: 'project',
        handle: 11,
        found: true,
        record: { handle: 11, title: 'Alpha' },
      },
    });

    expect(link).toEqual({
      path: '/table/project?filter=%7B%22handle%22%3A11%7D',
      entityHandle: 'project',
      kind: 'record',
    });
  });

  it('prefers direct entityRoute paths from generic_get results', () => {
    const link = buildNavigationLink({
      serverHandle: 0,
      serverName: 'sapling',
      toolName: 'generic_get',
      arguments: {
        entityHandle: 'entityRoute',
        handle: 8,
      },
      rawResult: {
        found: true,
        record: {
          handle: 8,
          route: 'dashboard/overview',
        },
      },
    });

    expect(link).toEqual({
      path: '/dashboard/overview',
      entityHandle: 'entityRoute',
      kind: 'route',
    });
  });

  it('builds list navigation links for ticket_search results', () => {
    const link = buildNavigationLink({
      serverHandle: 0,
      serverName: 'sapling',
      toolName: 'ticket_search',
      arguments: {
        query: 'Sage 100',
        searchMode: 'solution',
      },
      rawResult: {
        appliedFilter: {
          $or: [{ solutionDescription: { $ilike: '%Sage 100%' } }],
        },
      },
    });

    expect(link).toEqual({
      path: '/table/ticket?filter=%7B%22%24or%22%3A%5B%7B%22solutionDescription%22%3A%7B%22%24ilike%22%3A%22%25Sage%20100%25%22%7D%7D%5D%7D',
      entityHandle: 'ticket',
      kind: 'list',
    });
  });

  it('mentions semantic_search and ticket_search guidance for ticket questions in the system instruction', () => {
    const service = createService();

    const instruction = (
      service as never as {
        buildSystemInstruction: (options?: {
          includeToolGuidance?: boolean;
        }) => string;
      }
    ).buildSystemInstruction({ includeToolGuidance: true });

    expect(instruction).toContain(
      'use semantic_search with entityHandle ticket first',
    );
    expect(instruction).toContain(
      'Semantic search is especially useful for natural-language symptoms',
    );
    expect(instruction).toContain(
      'indexed long-text fields on event, salesOpportunity, effortEstimate, and effortEstimatePosition',
    );
    expect(instruction).toContain('use knowledge_search first');
    expect(instruction).toContain('knowledgeArticle');
    expect(instruction).toContain('Use ticket_search for exact ticket numbers');
    expect(instruction).toContain(
      'Prefer ticket_search with searchMode solution',
    );
  });

  it('instructs Songbird not to expose internal handles in user-facing prose', () => {
    const service = createService();

    const instruction = (
      service as never as {
        buildSystemInstruction: (options?: {
          includeToolGuidance?: boolean;
        }) => string;
      }
    ).buildSystemInstruction({ includeToolGuidance: true });

    expect(instruction).toContain(
      'Do not expose internal technical identifiers such as raw record handles',
    );
    expect(instruction).toContain(
      'You may still mention explicit user-facing business identifiers such as a ticket number or external number',
    );
  });

  it('resolves Gemini tool calls by raw tool name when the server prefix is omitted', async () => {
    const mcpService = {
      executeTool: jest.fn<ExecuteToolMock>().mockResolvedValue({
        serverHandle: 0,
        serverName: 'sapling',
        toolName: 'current_person',
        content: '{}',
        rawResult: {},
      }),
    };
    const service = createService({}, mcpService);

    await (
      service as never as {
        executeAutomaticToolCall: (
          toolRegistry: Array<{
            encodedName: string;
            descriptor: {
              serverName: string;
              toolName: string;
            };
          }>,
          encodedName: string,
          args: Record<string, unknown>,
          user: unknown,
        ) => Promise<unknown>;
      }
    ).executeAutomaticToolCall(
      [
        {
          encodedName: 'sapling__current_person',
          descriptor: {
            serverName: 'sapling',
            toolName: 'current_person',
          },
        },
      ],
      'current_person',
      {},
      { handle: 1 },
    );

    expect(mcpService.executeTool).toHaveBeenCalledWith(
      'sapling',
      'current_person',
      {},
      { handle: 1 },
    );
  });

  it('resolves Gemini tool calls when consecutive underscores are collapsed', async () => {
    const mcpService = {
      executeTool: jest.fn<ExecuteToolMock>().mockResolvedValue({
        serverHandle: 0,
        serverName: 'sapling',
        toolName: 'semantic_search',
        content: '{}',
        rawResult: {},
      }),
    };
    const service = createService({}, mcpService);

    await (
      service as never as {
        executeAutomaticToolCall: (
          toolRegistry: Array<{
            encodedName: string;
            descriptor: {
              serverName: string;
              toolName: string;
            };
          }>,
          encodedName: string,
          args: Record<string, unknown>,
          user: unknown,
        ) => Promise<unknown>;
      }
    ).executeAutomaticToolCall(
      [
        {
          encodedName: 'sapling__semantic_search',
          descriptor: {
            serverName: 'sapling',
            toolName: 'semantic_search',
          },
        },
      ],
      'sapling_semantic_search',
      { entityHandle: 'ticket', query: 'Sage startet nicht' },
      { handle: 1 },
    );

    expect(mcpService.executeTool).toHaveBeenCalledWith(
      'sapling',
      'semantic_search',
      { entityHandle: 'ticket', query: 'Sage startet nicht' },
      { handle: 1 },
    );
  });

  it('marks confirmed tool actions as failed when the tool returns an error payload', async () => {
    const action = {
      handle: 1,
      status: 'pending',
      session: { handle: 2 },
      message: { handle: 3 },
      person: { handle: 9 },
      agent: 'importStrategyAgent',
      serverName: 'sapling',
      toolName: 'import_execute_batch',
      arguments: { batchHandle: 2 },
      errorPayload: null as unknown,
      createdAt: new Date('2026-04-20T08:15:30.000Z'),
      updatedAt: new Date('2026-04-20T08:15:30.000Z'),
    };
    const em = {
      findOne: jest
        .fn<() => Promise<typeof action | null>>()
        .mockResolvedValue(action),
      flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const mcpService = {
      executeTool: jest
        .fn<() => Promise<ExecuteToolResult>>()
        .mockResolvedValue({
          serverHandle: 0,
          serverName: 'sapling',
          toolName: 'import_execute_batch',
          content: '{"ok":false,"error":"import.failed"}',
          rawResult: { ok: false, error: 'import.failed' },
          modelResult: { ok: false, error: 'import.failed' },
        }),
    };
    const agentPolicy = {
      buildToolPolicy: jest.fn().mockReturnValue({}),
    };
    const service = createService(
      em,
      mcpService,
      {},
      {},
      {},
      undefined,
      agentPolicy,
    );

    const result = await service.confirmToolAction(1, { handle: 9 } as never);

    expect(result.status).toBe('failed');
    expect(action.status).toBe('failed');
    expect(action.errorPayload).toEqual({ error: 'import.failed' });
    expect(em.flush).toHaveBeenCalled();
  });

  it('returns an already completed tool action instead of failing a duplicate confirm', async () => {
    const action = {
      handle: 1,
      status: 'executed',
      session: { handle: 2 },
      message: { handle: 3 },
      person: { handle: 9 },
      agent: 'importStrategyAgent',
      serverName: 'sapling',
      toolName: 'import_execute_batch',
      arguments: { batchHandle: 2 },
      createdAt: new Date('2026-04-20T08:15:30.000Z'),
      updatedAt: new Date('2026-04-20T08:15:30.000Z'),
    };
    const em = {
      findOne: jest
        .fn<() => Promise<typeof action | null>>()
        .mockResolvedValue(action),
      flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const mcpService = {
      executeTool: jest.fn(),
    };
    const service = createService(em, mcpService);

    const result = await service.confirmToolAction(1, { handle: 9 } as never);

    expect(result.status).toBe('executed');
    expect(mcpService.executeTool).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('does not prepare import execution actions for unvalidated batches', async () => {
    const importService = {
      getBatch: jest
        .fn<
          () => Promise<{
            handle: number;
            status: string;
            entityHandle: string;
            readyCount: number;
          }>
        >()
        .mockResolvedValue({
          handle: 2,
          status: 'analyzed',
          entityHandle: 'product',
          readyCount: 0,
        }),
    };
    const service = createService(
      {},
      {},
      {},
      {},
      {},
      undefined,
      {},
      importService,
    );

    const result = await (
      service as never as {
        preflightPendingToolAction: (
          descriptor: {
            serverHandle: number;
            serverName: string;
            toolName: string;
          },
          args: Record<string, unknown>,
        ) => Promise<ExecuteToolResult | null>;
      }
    ).preflightPendingToolAction(
      {
        serverHandle: 0,
        serverName: 'sapling',
        toolName: 'import_execute_batch',
      },
      { batchHandle: 2 },
    );

    expect(result?.modelResult).toMatchObject({
      ok: false,
      pendingToolAction: false,
      error: 'import.batchNotReadyForExecution',
    });
  });

  it('creates a follow-up execution action after confirmed import configuration', async () => {
    const action = {
      handle: 4,
      status: 'pending',
      session: { handle: 2 },
      message: { handle: 3 },
      person: { handle: 9 },
      agent: null,
      serverName: 'sapling',
      toolName: 'import_configure_batch',
      arguments: { batchHandle: 4, entityHandle: 'product' },
      resultPayload: null as unknown,
      errorPayload: null as unknown,
      createdAt: new Date('2026-04-20T08:15:30.000Z'),
      updatedAt: new Date('2026-04-20T08:15:30.000Z'),
    };
    const em = {
      create: jest.fn((_entity: unknown, payload: Record<string, unknown>) => ({
        handle: 44,
        ...payload,
        createdAt: new Date('2026-04-20T08:15:30.000Z'),
        updatedAt: new Date('2026-04-20T08:15:30.000Z'),
      })),
      findOne: jest
        .fn<() => Promise<typeof action | null>>()
        .mockResolvedValue(action),
      flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      persist: jest.fn(),
    };
    const mcpService = {
      executeTool: jest
        .fn<() => Promise<ExecuteToolResult>>()
        .mockResolvedValue({
          serverHandle: 0,
          serverName: 'sapling',
          toolName: 'import_configure_batch',
          content:
            '{"handle":4,"status":"validated","entityHandle":"product","readyCount":2}',
          rawResult: {
            handle: 4,
            status: 'validated',
            entityHandle: 'product',
            readyCount: 2,
          },
          modelResult: {
            handle: 4,
            status: 'validated',
            entityHandle: 'product',
            readyCount: 2,
          },
        }),
    };
    const agentPolicy = {
      buildToolPolicy: jest.fn().mockReturnValue({}),
    };
    const service = createService(
      em,
      mcpService,
      {},
      {},
      {},
      undefined,
      agentPolicy,
    );

    const result = await service.confirmToolAction(4, { handle: 9 } as never);
    const followUpToolAction = result.resultPayload?.followUpToolAction as
      | Record<string, unknown>
      | undefined;

    expect(result.status).toBe('executed');
    expect(followUpToolAction).toMatchObject({
      handle: 44,
      serverName: 'sapling',
      toolName: 'import_execute_batch',
      status: 'pending',
      arguments: { batchHandle: 4 },
    });
  });

  it('replaces hallucinated Sapling URLs with the canonical navigation link', () => {
    const normalizedContent = alignAssistantContentWithNavigationLinks(
      'Du kannst das Ticket hier einsehen: https://sapling.ai/partner/ticket/12',
      [
        {
          path: '/table/ticket?filter=%7B%22handle%22%3A%7B%22%24in%22%3A%5B12%5D%7D%7D',
          entityHandle: 'ticket',
          kind: 'list',
        },
      ],
      'http://localhost:5173/dashboard',
    );

    expect(normalizedContent).toBe(
      'Du kannst das Ticket hier einsehen: http://localhost:5173/table/ticket?filter=%7B%22handle%22%3A%7B%22%24in%22%3A%5B12%5D%7D%7D',
    );
  });
});
