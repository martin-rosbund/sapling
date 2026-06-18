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
jest.mock('../import/import.service', () => ({ ImportService: class {} }));
jest.mock('./ai.service', () => ({ AiService: class {} }));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_HANDLES: [
    'person',
    'project',
    'ticket',
    'ticketStatus',
    'event',
    'salesOpportunity',
    'effortEstimate',
    'effortEstimatePosition',
    'knowledgeArticle',
  ],
}));

import { SaplingMcpService } from './sapling-mcp.service';
import { SaplingMcpCriteriaService } from './sapling-mcp-criteria.service';
import { SaplingMcpResultFormatterService } from './sapling-mcp-result-formatter.service';
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
  importService = {},
  aiService = { searchVectorDocuments: jest.fn() },
  permissionService = { assertEntityPermission: jest.fn() },
}: {
  genericService?: Record<string, jest.Mock>;
  currentService?: Record<string, jest.Mock>;
  templateService?: { getEntityTemplate: jest.Mock<any> };
  importService?: Record<string, jest.Mock> | Record<string, unknown>;
  aiService?: { searchVectorDocuments: jest.Mock };
  permissionService?: { assertEntityPermission: jest.Mock };
} = {}) =>
  new SaplingMcpService(
    genericService as never,
    currentService as never,
    templateService as never,
    importService as never,
    aiService as never,
    new SaplingMcpCriteriaService(templateService as never),
    permissionService as never,
    new SaplingMcpResultFormatterService(templateService as never),
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

  it('adds current reference defaults before generic ticket creates', async () => {
    const genericService = {
      create: jest.fn().mockResolvedValue({
        entityHandle: 'ticket',
        handle: 42,
        title: 'Import failure',
      } as never),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const currentService = {
      getPerson: jest.fn().mockResolvedValue({
        handle: 9,
        company: { handle: 23 },
      } as never),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'ticket') {
          return [
            createTemplateField({ name: 'title' }),
            createTemplateField({
              name: 'assigneeCompany',
              kind: 'm:1',
              isReference: true,
              isRequired: false,
              referenceName: 'company',
              options: ['isCompany', 'isCurrentCompany'],
            }),
            createTemplateField({
              name: 'assigneePerson',
              kind: 'm:1',
              isReference: true,
              isRequired: false,
              referenceName: 'person',
              options: ['isPerson', 'isCurrentPerson'],
            }),
            createTemplateField({
              name: 'creatorCompany',
              kind: 'm:1',
              isReference: true,
              isRequired: true,
              referenceName: 'company',
              options: ['isCompany', 'isCurrentCompany'],
            }),
            createTemplateField({
              name: 'creatorPerson',
              kind: 'm:1',
              isReference: true,
              isRequired: true,
              referenceName: 'person',
              options: ['isPerson', 'isCurrentPerson'],
            }),
          ];
        }

        return [];
      }),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });
    const user = { handle: 9 } as never;

    await service.executeTool(
      'generic_create',
      {
        entityHandle: 'ticket',
        data: { title: 'Import failure' },
      },
      user,
    );

    expect(genericService.create).toHaveBeenCalledWith(
      'ticket',
      {
        title: 'Import failure',
        assigneeCompany: 23,
        assigneePerson: 9,
        creatorCompany: 23,
        creatorPerson: 9,
      },
      user,
    );
  });

  it('keeps explicit current reference payload values on generic creates', async () => {
    const genericService = {
      create: jest.fn().mockResolvedValue({
        entityHandle: 'ticket',
        handle: 43,
        title: 'Import failure',
      } as never),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const currentService = {
      getPerson: jest.fn().mockResolvedValue({
        handle: 9,
        company: { handle: 23 },
      } as never),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'ticket') {
          return [
            createTemplateField({ name: 'title' }),
            createTemplateField({
              name: 'assigneeCompany',
              kind: 'm:1',
              isReference: true,
              referenceName: 'company',
              options: ['isCompany', 'isCurrentCompany'],
            }),
            createTemplateField({
              name: 'assigneePerson',
              kind: 'm:1',
              isReference: true,
              referenceName: 'person',
              options: ['isPerson', 'isCurrentPerson'],
            }),
            createTemplateField({
              name: 'creatorCompany',
              kind: 'm:1',
              isReference: true,
              isRequired: true,
              referenceName: 'company',
              options: ['isCompany', 'isCurrentCompany'],
            }),
            createTemplateField({
              name: 'creatorPerson',
              kind: 'm:1',
              isReference: true,
              isRequired: true,
              referenceName: 'person',
              options: ['isPerson', 'isCurrentPerson'],
            }),
          ];
        }

        return [];
      }),
    };
    const service = createService({
      genericService,
      currentService,
      templateService,
    });
    const user = { handle: 9 } as never;

    await service.executeTool(
      'generic_create',
      {
        entityHandle: 'ticket',
        data: {
          title: 'Import failure',
          assigneeCompany: 31,
          assigneePerson: 32,
          creatorCompany: 41,
          creatorPerson: 42,
        },
      },
      user,
    );

    expect(currentService.getPerson).not.toHaveBeenCalled();
    expect(genericService.create).toHaveBeenCalledWith(
      'ticket',
      {
        title: 'Import failure',
        assigneeCompany: 31,
        assigneePerson: 32,
        creatorCompany: 41,
        creatorPerson: 42,
      },
      user,
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

  it('returns a schema repair response for invalid generic_list filters', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'ticketStatus') {
          return [
            createTemplateField({ name: 'handle', isPrimaryKey: true }),
            createTemplateField({
              name: 'description',
              options: ['isValue', 'isOrderASC'],
            }),
            createTemplateField({ name: 'color' }),
            createTemplateField({ name: 'icon' }),
            createTemplateField({ name: 'isOpen', type: 'boolean' }),
          ];
        }

        return [];
      }),
    };
    const service = createService({ genericService, templateService });

    const result = await service.executeTool(
      'generic_list',
      {
        entityHandle: 'ticketStatus',
        filter: { title: { $ilike: '%offen%' } },
      },
      { handle: 1 } as never,
    );

    expect(genericService.findAndCount).not.toHaveBeenCalled();
    expect(result.rawResult).toMatchObject({
      entityHandle: 'ticketStatus',
      queryExecuted: false,
      status: 'needs_schema_retry',
      suggestedFields: expect.arrayContaining(['description', 'handle']),
      validFields: expect.arrayContaining(['handle', 'description']),
      invalidFields: [
        expect.objectContaining({
          entityHandle: 'ticketStatus',
          fieldPath: 'title',
          fieldName: 'title',
          mode: 'filter',
          suggestedFields: expect.arrayContaining(['description', 'handle']),
        }),
      ],
    });
    expect(result.modelResult).toMatchObject({
      entityHandle: 'ticketStatus',
      queryExecuted: false,
      status: 'needs_schema_retry',
    });
    expect(result.rawResult).not.toMatchObject({ ok: false });
  });

  it('returns a schema repair response for invalid generic_list orderBy fields', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const templateService = {
      getEntityTemplate: jest
        .fn()
        .mockReturnValue([
          createTemplateField({ name: 'handle', isPrimaryKey: true }),
          createTemplateField({ name: 'description', options: ['isValue'] }),
        ]),
    };
    const service = createService({ genericService, templateService });

    const result = await service.executeTool(
      'generic_list',
      {
        entityHandle: 'ticketStatus',
        orderBy: { title: 'ASC' },
      },
      { handle: 1 } as never,
    );

    expect(genericService.findAndCount).not.toHaveBeenCalled();
    expect(result.rawResult).toMatchObject({
      queryExecuted: false,
      status: 'needs_schema_retry',
      invalidFields: [
        expect.objectContaining({
          fieldPath: 'title',
          mode: 'orderBy',
          suggestedFields: expect.arrayContaining(['description', 'handle']),
        }),
      ],
    });
  });

  it('returns a schema repair response for invalid dotted relation fields', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'ticket') {
          return [
            createTemplateField({ name: 'title', options: ['isValue'] }),
            createTemplateField({
              name: 'status',
              isReference: true,
              referenceName: 'ticketStatus',
            }),
          ];
        }

        if (entityHandle === 'ticketStatus') {
          return [
            createTemplateField({ name: 'handle', isPrimaryKey: true }),
            createTemplateField({ name: 'description', options: ['isValue'] }),
          ];
        }

        return [];
      }),
    };
    const service = createService({ genericService, templateService });

    const result = await service.executeTool(
      'generic_list',
      {
        entityHandle: 'ticket',
        filter: { 'status.title': { $eq: 'Offen' } },
      },
      { handle: 1 } as never,
    );

    expect(genericService.findAndCount).not.toHaveBeenCalled();
    expect(result.rawResult).toMatchObject({
      queryExecuted: false,
      status: 'needs_schema_retry',
      invalidFields: [
        expect.objectContaining({
          entityHandle: 'ticketStatus',
          fieldPath: 'status.title',
          fieldName: 'title',
          suggestedFields: expect.arrayContaining(['description', 'handle']),
        }),
      ],
    });
  });

  it('keeps valid generic_list relation filters executable', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0 },
      } as never),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'ticket') {
          return [
            createTemplateField({ name: 'title', options: ['isValue'] }),
            createTemplateField({
              name: 'status',
              isReference: true,
              referenceName: 'ticketStatus',
            }),
          ];
        }

        if (entityHandle === 'ticketStatus') {
          return [
            createTemplateField({ name: 'handle', isPrimaryKey: true }),
            createTemplateField({ name: 'description', options: ['isValue'] }),
          ];
        }

        return [];
      }),
    };
    const service = createService({ genericService, templateService });
    const user = { handle: 1 } as never;

    await service.executeTool(
      'generic_list',
      {
        entityHandle: 'ticket',
        filter: { status: { description: { ilike: '%offen%' } } },
      },
      user,
    );

    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'ticket',
      { status: { description: { $ilike: '%offen%' } } },
      1,
      50,
      {},
      user,
      [],
    );
  });

  it('keeps permission failures as tool errors', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn(),
    };
    const permissionService = {
      assertEntityPermission: jest
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error('global.permissionDenied')),
    };
    const service = createService({ genericService, permissionService });

    const result = await service.executeTool(
      'generic_list',
      { entityHandle: 'ticketStatus', filter: { title: 'Offen' } },
      { handle: 1 } as never,
    );

    expect(genericService.findAndCount).not.toHaveBeenCalled();
    expect(result.rawResult).toMatchObject({
      ok: false,
      toolName: 'generic_list',
      error: 'global.permissionDenied',
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

  it('uses isValue fields in model-facing generic_get output and keeps handles for follow-up tools', async () => {
    const genericService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getRecordTimeline: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue({
        data: [
          {
            handle: 21,
            title: 'Dokumentenablage fuer Angebote',
            ticket: {
              handle: 46,
              title: 'Techniker Einsatzplanung',
            },
            positions: [
              {
                handle: 61,
                title: 'Dokumenttypen definieren',
              },
            ],
          },
        ],
      } as never),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        if (entityHandle === 'effortEstimate') {
          return [
            createTemplateField({
              name: 'handle',
              type: 'number',
              isPrimaryKey: true,
              isAutoIncrement: true,
            }),
            createTemplateField({ name: 'title', options: ['isValue'] }),
            createTemplateField({
              name: 'ticket',
              isReference: true,
              referenceName: 'ticket',
            }),
            createTemplateField({
              name: 'positions',
              isReference: true,
              referenceName: 'effortEstimatePosition',
            }),
          ];
        }

        if (entityHandle === 'ticket') {
          return [
            createTemplateField({
              name: 'handle',
              type: 'number',
              isPrimaryKey: true,
              isAutoIncrement: true,
            }),
            createTemplateField({ name: 'title', options: ['isValue'] }),
          ];
        }

        if (entityHandle === 'effortEstimatePosition') {
          return [
            createTemplateField({
              name: 'handle',
              type: 'number',
              isPrimaryKey: true,
              isAutoIncrement: true,
            }),
            createTemplateField({ name: 'title', options: ['isValue'] }),
          ];
        }

        return [];
      }),
    };
    const service = createService({ genericService, templateService });
    const user = { handle: 1 } as never;

    const result = await service.executeTool(
      'generic_get',
      {
        entityHandle: 'effortEstimate',
        handle: 21,
        relations: ['ticket', 'positions'],
      },
      user,
    );

    expect(result.rawResult).toMatchObject({
      handle: 21,
      record: {
        handle: 21,
        ticket: { handle: 46 },
        positions: [{ handle: 61 }],
      },
    });
    expect(result.modelResult).toMatchObject({
      entityHandle: 'effortEstimate',
      handle: 21,
      displayValue: 'Dokumentenablage fuer Angebote',
      record: {
        handle: 21,
        displayValue: 'Dokumentenablage fuer Angebote',
        title: 'Dokumentenablage fuer Angebote',
        ticket: {
          handle: 46,
          displayValue: 'Techniker Einsatzplanung',
          title: 'Techniker Einsatzplanung',
        },
        positions: [
          {
            handle: 61,
            displayValue: 'Dokumenttypen definieren',
            title: 'Dokumenttypen definieren',
          },
        ],
      },
    });
    expect(JSON.stringify(result.modelResult)).toContain('"handle"');
    expect(result.content).toContain('"displayValue"');
    expect(result.content).toContain('"handle"');
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
    expect(result.modelResult).toMatchObject({
      entityHandle: 'ticket',
      data: [
        {
          handle: 42,
          displayValue: 'Sage 100 Fehler',
          title: 'Sage 100 Fehler',
        },
      ],
    });
  });

  it('forwards semantic_search to AiService with normalized limits', async () => {
    const aiService = {
      searchVectorDocuments: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          entityHandle: 'effortEstimate',
          indexed: true,
          results: [],
        }),
    };
    const service = createService({ aiService });
    const user = { handle: 1 } as never;

    const result = await service.executeTool(
      'semantic_search',
      {
        entityHandle: 'effortEstimate',
        query: 'Anforderungen fuer Portal-Synchronisation',
        limit: 99,
      },
      user,
    );

    expect(aiService.searchVectorDocuments).toHaveBeenCalledWith(
      'effortEstimate',
      'Anforderungen fuer Portal-Synchronisation',
      user,
      20,
    );
    expect(result.rawResult).toMatchObject({
      entityHandle: 'effortEstimate',
      indexed: true,
      results: [],
    });
  });

  it('combines readable sources for knowledge_search', async () => {
    const aiService = {
      searchVectorDocuments: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockImplementation((entityHandle: unknown) =>
          Promise.resolve({
            entityHandle,
            indexed: true,
            results: [
              {
                handle: entityHandle === 'knowledgeArticle' ? 7 : 42,
                score: entityHandle === 'knowledgeArticle' ? 0.91 : 0.82,
                record: { title: `${String(entityHandle)} Treffer` },
                matches: [],
              },
            ],
          }),
        ),
    };
    const permissionService = {
      assertEntityPermission: jest
        .fn<(...args: unknown[]) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const service = createService({ aiService, permissionService });
    const user = { handle: 1 } as never;

    const result = await service.executeTool(
      'knowledge_search',
      {
        query: 'Sage startet nach Update nicht',
        entityHandles: ['knowledgeArticle', 'ticket'],
        limit: 5,
      },
      user,
    );

    expect(permissionService.assertEntityPermission).toHaveBeenCalledWith(
      user,
      'knowledgeArticle',
      'allowRead',
    );
    expect(aiService.searchVectorDocuments).toHaveBeenCalledWith(
      'knowledgeArticle',
      'Sage startet nach Update nicht',
      user,
      5,
    );
    expect(aiService.searchVectorDocuments).toHaveBeenCalledWith(
      'ticket',
      'Sage startet nach Update nicht',
      user,
      5,
    );
    expect(result.rawResult).toMatchObject({
      query: 'Sage startet nach Update nicht',
      indexedEntityHandles: ['knowledgeArticle', 'ticket'],
      results: [
        {
          entityHandle: 'knowledgeArticle',
          handle: 7,
          score: 0.91,
        },
        {
          entityHandle: 'ticket',
          handle: 42,
          score: 0.82,
        },
      ],
    });
    expect(result.modelResult).toMatchObject({
      results: [
        {
          entityHandle: 'knowledgeArticle',
          handle: 7,
        },
        {
          entityHandle: 'ticket',
          handle: 42,
        },
      ],
    });
  });

  it('normalizes AI import configure payloads and ignores external keys without a source', async () => {
    const currentService = {
      getPerson: jest.fn().mockResolvedValue({
        handle: 1,
        roles: [{ isAdministrator: true }],
      } as never),
    };
    const importService = {
      getBatch: jest.fn().mockResolvedValue({
        handle: 3,
        headers: ['handle', 'title', 'name', 'version', 'description'],
      } as never),
      configureBatch: jest.fn().mockResolvedValue({
        handle: 3,
        status: 'validated',
        entityHandle: 'product',
        readyCount: 2,
      } as never),
    };
    const permissionService = {
      assertEntityPermission: jest.fn().mockResolvedValue(undefined as never),
    };
    const service = createService({
      currentService,
      importService,
      permissionService,
    });
    const user = { handle: 1 } as never;

    await service.executeTool(
      'import_configure_batch',
      {
        batchHandle: 3,
        entityHandle: 'product',
        mappings: {
          name: 'name',
          title: 'title',
          version: 'version',
          description: 'description',
        },
        keyColumns: ['name'],
      },
      user,
    );

    expect(importService.configureBatch).toHaveBeenCalledWith(
      3,
      {
        entityHandle: 'product',
        sourceHandle: null,
        templateHandle: null,
        keyColumns: [],
        mappings: [
          { sourceColumn: 'handle', targetField: 'handle' },
          { sourceColumn: 'name', targetField: 'name' },
          { sourceColumn: 'title', targetField: 'title' },
          { sourceColumn: 'version', targetField: 'version' },
          { sourceColumn: 'description', targetField: 'description' },
        ],
        relationMappings: [],
        valueMappings: [],
        genericReferenceMapping: null,
      },
      user,
    );
  });
});
