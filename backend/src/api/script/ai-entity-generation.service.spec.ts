import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../ai/openai-ai.runtime', () => ({
  createOpenAiClient: jest.fn(),
}));

jest.mock('../ai/gemini-ai.runtime', () => ({
  createGeminiClient: jest.fn(),
}));

import { AiEntityGenerationService } from './ai-entity-generation.service';
import { createOpenAiClient } from '../ai/openai-ai.runtime';

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('AiEntityGenerationService', () => {
  beforeEach(() => {
    asMock(createOpenAiClient).mockReset();
  });

  it('generates mapped target payloads and creates the configured entity', async () => {
    type CreateCompletionMock = (...args: unknown[]) => Promise<unknown>;
    type FindOneMock = (...args: unknown[]) => Promise<unknown>;
    type PersistMock = (...args: unknown[]) => { flush: () => Promise<void> };
    type ResolveRuntimeTargetMock = (...args: unknown[]) => Promise<unknown>;
    const createCompletion = jest.fn<CreateCompletionMock>().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 'Cache neu aufbauen',
              summary: 'Interner Entwurf aus dem Ticket.',
              problemMarkdown: '## Problem\nCache ist veraltet.',
              solutionMarkdown: '## Loesung\nCache leeren und neu erzeugen.',
              tags: ['cache', 'support'],
            }),
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

    const permissionUser = {
      handle: 7,
      roles: [
        {
          permissions: [
            {
              entity: { handle: 'ticket' },
              allowRead: true,
            },
            {
              entity: { handle: 'knowledgeArticle' },
              allowInsert: true,
            },
          ],
        },
      ],
    };
    const template = {
      handle: 'ticketKnowledgeArticle',
      title: 'Ticket zu Wissensartikel',
      actionName: 'aiCreateKnowledgeArticle',
      sourceEntity: { handle: 'ticket' },
      targetEntity: { handle: 'knowledgeArticle' },
      sourceRelations: ['status', 'contract.products'],
      promptMarkdown: 'Erstelle einen Artikel.',
      fieldMapping: {
        title: 'title',
        summary: 'summary',
        problemMarkdown: 'problemMarkdown',
        solutionMarkdown: 'solutionMarkdown',
        tags: 'tags',
      },
      sourceFieldMapping: {
        'contract.products.0': 'product',
      },
      targetDefaults: {
        status: 'draft',
        visibility: 'internal',
      },
      sourceReferenceField: 'sourceTicket',
      userReferenceField: 'authorPerson',
    };
    const sourceRecord = {
      handle: 42,
      title: 'Cache Problem',
      contract: {
        products: [{ handle: 5, title: 'Sapling CRM' }],
      },
      password: 'secret',
    };
    const createdEntity = {
      handle: 55,
      status: 'draft',
    };
    const em = {
      findOne: jest
        .fn<FindOneMock>()
        .mockResolvedValueOnce(permissionUser)
        .mockResolvedValueOnce(template)
        .mockResolvedValueOnce(sourceRecord),
      create: jest.fn().mockReturnValue(createdEntity),
      persist: jest.fn<PersistMock>().mockReturnValue({
        flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      }),
    };
    const providerRegistry = {
      resolveRuntimeTarget: jest
        .fn<ResolveRuntimeTargetMock>()
        .mockResolvedValue({
          providerKind: 'openai',
          provider: { handle: 'openai' },
          model: { providerModel: 'gpt-4.1-mini' },
        }),
    };
    const genericPermissionService = {
      checkTopLevelPermission: jest.fn(),
    };
    const service = new AiEntityGenerationService(
      em as never,
      providerRegistry as never,
      genericPermissionService as never,
    );

    const result = await service.generateFromScriptButton({
      items: [{ handle: 42 }],
      sourceEntity: { handle: 'ticket' } as never,
      user: { handle: 7 } as never,
      actionName: 'aiCreateKnowledgeArticle',
      parameter: { template: 'ticketKnowledgeArticle' },
    });

    expect(em.findOne).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      {
        isActive: true,
        actionName: 'aiCreateKnowledgeArticle',
        sourceEntity: { handle: 'ticket' },
        handle: 'ticketKnowledgeArticle',
      },
      expect.any(Object),
    );
    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
      }),
    );
    expect(JSON.stringify(createCompletion.mock.calls[0][0])).not.toContain(
      '"password"',
    );
    expect(em.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        status: 'draft',
        visibility: 'internal',
        title: 'Cache neu aufbauen',
        summary: 'Interner Entwurf aus dem Ticket.',
        tags: 'cache, support',
        product: 5,
        sourceTicket: 42,
        authorPerson: 7,
      }),
    );
    expect(
      genericPermissionService.checkTopLevelPermission,
    ).toHaveBeenCalledWith(
      'knowledgeArticle',
      expect.objectContaining({
        product: 5,
        sourceTicket: 42,
        authorPerson: 7,
      }),
      permissionUser,
      'allowInsertStage',
    );
    expect(em.persist).toHaveBeenCalledWith(createdEntity);
    expect(result).toMatchObject({
      templateHandle: 'ticketKnowledgeArticle',
      targetEntityHandle: 'knowledgeArticle',
      createdItem: {
        handle: 55,
      },
    });
  });
});
