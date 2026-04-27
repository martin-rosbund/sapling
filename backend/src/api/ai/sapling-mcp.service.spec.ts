import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    registerTool() {
      return;
    }

    connect() {
      return Promise.resolve();
    }
  },
}));
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: class {},
}));
jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  isInitializeRequest: jest.fn(),
}));
jest.mock('../generic/generic.service', () => ({ GenericService: class {} }));
jest.mock('../current/current.service', () => ({ CurrentService: class {} }));
jest.mock('../template/template.service', () => ({
  TemplateService: class {},
}));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_HANDLES: ['person', 'project', 'ticket'],
}));

import { SaplingMcpService } from './sapling-mcp.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';

const createTemplateField = (
  overrides: Partial<EntityTemplateDto>,
): EntityTemplateDto => ({
  name: '',
  type: 'string',
  isPrimaryKey: false,
  isAutoIncrement: false,
  isUnique: false,
  referenceName: '',
  isReference: false,
  isRequired: false,
  nullable: false,
  isPersistent: true,
  referencedPks: [],
  options: [],
  formGroup: null,
  formGroupOrder: null,
  formOrder: null,
  formWidth: null,
  ...overrides,
});

const createService = ({
  genericService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getRecordTimeline: jest.fn(),
    findAndCount: jest.fn(),
  },
  currentService = { getPerson: jest.fn() },
  templateService = { getEntityTemplate: jest.fn().mockReturnValue([]) },
  aiService = { searchVectorDocuments: jest.fn() },
}: {
  genericService?: Record<string, jest.Mock>;
  currentService?: Record<string, jest.Mock>;
  templateService?: { getEntityTemplate: jest.Mock };
  aiService?: { searchVectorDocuments: jest.Mock };
} = {}) =>
  new SaplingMcpService(
    genericService as never,
    currentService as never,
    templateService as never,
    aiService as never,
  );

describe('SaplingMcpService', () => {
  it('omits security fields from entity_schema responses', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const currentService = { getPerson: jest.fn() };
    const templateService = {
      getEntityTemplate: jest.fn().mockReturnValue([
        createTemplateField({ name: 'firstName' }),
        createTemplateField({
          name: 'loginPassword',
          options: ['isSecurity'],
          nullable: true,
        }),
      ]),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });

    const result = await service.executeTool(
      'entity_schema',
      { entityHandle: 'person' },
      { handle: 1 } as never,
    );

    expect(result.rawResult).toMatchObject({
      entityHandle: 'person',
      requiredFieldNames: [],
    });
    expect(
      (result.rawResult as { fields: Array<{ name: string }> }).fields.map(
        (field) => field.name,
      ),
    ).toEqual(['firstName']);
  });

  it('drops security fields before generic person updates', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ success: true } as never),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const currentService = { getPerson: jest.fn() };
    const templateService = {
      getEntityTemplate: jest.fn().mockReturnValue([
        createTemplateField({ name: 'firstName' }),
        createTemplateField({
          name: 'loginPassword',
          options: ['isSecurity'],
          nullable: true,
        }),
      ]),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });
    const user = { handle: 1 } as never;

    await service.executeTool(
      'generic_update',
      {
        entityHandle: 'person',
        handle: 7,
        data: {
          firstName: 'Ada',
          loginPassword: null,
        },
      },
      user,
    );

    expect(genericService.update).toHaveBeenCalledWith(
      'person',
      7,
      { firstName: 'Ada' },
      user,
      [],
    );
  });

  it('searches entities by handle and field names', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const currentService = { getPerson: jest.fn() };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'person') {
          return [
            createTemplateField({ name: 'firstName' }),
            createTemplateField({ name: 'email' }),
          ];
        }

        return [createTemplateField({ name: 'title' })];
      }),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });

    const result = await service.executeTool(
      'entity_search',
      { query: 'email' },
      { handle: 1 } as never,
    );

    expect(result.rawResult).toMatchObject({
      query: 'email',
      matches: [expect.objectContaining({ entityHandle: 'person' })],
    });
  });

  it('loads a single sanitized record with filtered relations via generic_get', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue({
        data: [
          {
            handle: 7,
            firstName: 'Ada',
          },
        ],
      } as never),
    };
    const currentService = { getPerson: jest.fn() };
    const templateService = {
      getEntityTemplate: jest.fn().mockReturnValue([
        createTemplateField({ name: 'firstName' }),
        createTemplateField({
          name: 'company',
          isReference: true,
          referenceName: 'company',
        }),
      ]),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });
    const user = { handle: 1 } as never;

    const result = await service.executeTool(
      'generic_get',
      {
        entityHandle: 'person',
        handle: 7,
        relations: ['company', 'unknownRelation'],
      },
      user,
    );

    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'person',
      { handle: 7 },
      1,
      1,
      {},
      user,
      ['company'],
    );
    expect(result.rawResult).toMatchObject({
      entityHandle: 'person',
      handle: 7,
      found: true,
      record: { firstName: 'Ada' },
    });
  });

  it('loads a record timeline via generic_timeline', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn().mockResolvedValue({
        entityHandle: 'project',
        handle: 11,
        hasMore: false,
      } as never),
      findAndCount: jest.fn(),
    };
    const currentService = { getPerson: jest.fn() };
    const templateService = {
      getEntityTemplate: jest.fn().mockReturnValue([]),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });
    const user = { handle: 1 } as never;

    await service.executeTool(
      'generic_timeline',
      {
        entityHandle: 'project',
        handle: 11,
        before: '2026-03',
        months: 9,
      },
      user,
    );

    expect(genericService.getRecordTimeline).toHaveBeenCalledWith(
      'project',
      11,
      user,
      '2026-03',
      9,
    );
  });

  it('searches TicketItem problem and solution fields via ticket_search', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue({
        data: [{ handle: 42, title: 'Sage 100 Fehler' }],
        meta: { total: 1 },
      } as never),
    };
    const currentService = { getPerson: jest.fn() };
    const templateService = {
      getEntityTemplate: jest.fn().mockReturnValue([]),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });
    const user = { handle: 1 } as never;

    const result = await service.executeTool(
      'ticket_search',
      {
        query: 'Sage 100',
        searchMode: 'solution',
        limit: 5,
      },
      user,
    );

    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'ticket',
      {
        $or: [
          { number: { $ilike: '%Sage 100%' } },
          { externalNumber: { $ilike: '%Sage 100%' } },
          { title: { $ilike: '%Sage 100%' } },
          { solutionDescription: { $ilike: '%Sage 100%' } },
        ],
      },
      1,
      5,
      {},
      user,
      [],
    );
    expect(result.rawResult).toMatchObject({
      entityHandle: 'ticket',
      query: 'Sage 100',
      searchMode: 'solution',
      data: [{ handle: 42, title: 'Sage 100 Fehler' }],
    });
  });

  it('forwards semantic_search to AiService with normalized limits', async () => {
    const aiService = {
      searchVectorDocuments: jest.fn().mockResolvedValue({
        entityHandle: 'ticket',
        indexed: true,
        results: [],
      }),
    };
    const service = createService({ aiService });
    const user = { handle: 1 } as never;

    const result = await service.executeTool(
      'semantic_search',
      {
        entityHandle: 'ticket',
        query: 'Sage startet nach Update nicht mehr',
        limit: 99,
      },
      user,
    );

    expect(aiService.searchVectorDocuments).toHaveBeenCalledWith(
      'ticket',
      'Sage startet nach Update nicht mehr',
      user,
      20,
    );
    expect(result.rawResult).toMatchObject({
      entityHandle: 'ticket',
      indexed: true,
      results: [],
    });
  });
});
