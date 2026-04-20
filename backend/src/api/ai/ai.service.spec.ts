import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

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
  CreateAiChatMessageDto: class {},
  CreateAiChatSessionDto: class {},
  UpdateAiChatSessionDto: class {},
}));
jest.mock('./mcp.service', () => ({ McpService: class {} }));

import { AiService } from './ai.service';

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

    const instruction = (service as never as {
      buildSystemInstruction: (options?: {
        includeToolGuidance?: boolean;
      }) => string;
    }).buildSystemInstruction({ includeToolGuidance: true });

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
});