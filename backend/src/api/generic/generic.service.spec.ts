import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({
  EntityManager: class {},
}));
jest.mock('../../entity/global/entity.decorator', () => ({
  Sapling: jest.fn(() => () => undefined),
  SaplingForm: jest.fn(() => () => undefined),
  SaplingDependsOn: jest.fn(() => () => undefined),
  hasSaplingOption: jest.fn(() => false),
}));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_MAP: {
    salesOpportunity: class SalesOpportunityItem {},
    person: class PersonItem {},
    personSession: class PersonSessionItem {},
    company: class CompanyItem {},
    ticket: class TicketItem {},
    tag: class TagItem {},
    aiChatSession: class AiChatSessionItem {},
    aiProviderModel: class AiProviderModelItem {},
  },
  ENTITY_REGISTRY: [],
}));
jest.mock('../../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../current/current.service', () => ({ CurrentService: class {} }));
jest.mock('../template/template.service', () => ({
  TemplateService: class {},
}));
jest.mock('../script/script.service', () => ({
  ScriptService: class {},
  ScriptMethods: {
    beforeRead: 0,
    afterRead: 1,
    beforeUpdate: 2,
    afterUpdate: 3,
    beforeInsert: 4,
    afterInsert: 5,
    beforeDelete: 6,
    afterDelete: 7,
    addReference: 8,
    deleteReference: 9,
  },
}));

import { GenericService } from './generic.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { hasSaplingOption } from '../../entity/global/entity.decorator';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from '../../script/core/script.result.server';
import { ScriptMethods } from '../script/script.service';
import { GenericFilterService } from './generic-filter.service';
import { GenericMutationService } from './generic-mutation.service';
import { GenericPayloadService } from './generic-payload.service';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReadService } from './generic-read.service';
import { GenericRelationService } from './generic-relation.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericSanitizerService } from './generic-sanitizer.service';
import { GenericTimelineService } from './generic-timeline.service';

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

const createGenericService = ({
  em,
  templateService,
  currentService,
  scriptService = {},
}: {
  em: object;
  templateService: object;
  currentService: object;
  scriptService?: object;
}) =>
  (() => {
    const queryService = new GenericQueryService(templateService as never);
    const filterService = new GenericFilterService();
    const mutationService = new GenericMutationService(
      em as never,
      scriptService as never,
      filterService,
    );
    const permissionService = new GenericPermissionService(
      currentService as never,
      templateService as never,
    );
    const referenceService = new GenericReferenceService(
      em as never,
      templateService as never,
      permissionService,
      queryService,
    );
    const payloadService = new GenericPayloadService(referenceService);
    const readService = new GenericReadService(
      em as never,
      scriptService as never,
      filterService,
      permissionService,
    );
    const sanitizerService = new GenericSanitizerService(
      templateService as never,
    );
    const relationService = new GenericRelationService(
      em as never,
      templateService as never,
      permissionService,
      queryService,
      referenceService,
      sanitizerService,
    );
    const timelineService = new GenericTimelineService(
      templateService as never,
      currentService as never,
    );

    return new GenericService(
      em as never,
      templateService as never,
      queryService,
      readService,
      mutationService,
      payloadService,
      relationService,
      permissionService,
      referenceService,
      sanitizerService,
      timelineService,
    );
  })();

describe('GenericService', () => {
  it('normalizes dotted relation filters and infers populate relations', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(
      () => [[{ handle: 7 }], 1] as [object[], number],
    );
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'salesOpportunity':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({
                name: 'assigneePerson',
                isReference: true,
                kind: 'm:1',
                referenceName: 'person',
                referencedPks: ['handle'],
              }),
            ];
          case 'person':
            return [createTemplateField({ name: 'handle', type: 'number' })];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    await service.findAndCount(
      'salesOpportunity',
      { 'assigneePerson.handle': { $eq: 1 } },
      1,
      25,
      {},
      { handle: 1 } as never,
      [],
    );

    expect(findAndCount.mock.calls[0]).toEqual([
      expect.any(Function),
      { assigneePerson: { handle: { $eq: 1 } } },
      expect.objectContaining({
        populate: ['assigneePerson'],
      }),
    ]);
  });

  it('sanitizes security fields without mutating managed relation objects', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(
      (...args: unknown[]) =>
        args[1] === 'loginPassword' && args[2] === 'isSecurity',
    );

    const originalPassword = 'hashed-secret';
    const assigneePerson = {
      handle: 1,
      firstName: 'Ada',
      loginPassword: originalPassword,
    };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(
      () =>
        [
          [
            {
              handle: 7,
              assigneePerson,
            },
          ],
          1,
        ] as [object[], number],
    );
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'salesOpportunity':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({
                name: 'assigneePerson',
                isReference: true,
                kind: 'm:1',
                referenceName: 'person',
                referencedPks: ['handle'],
              }),
            ];
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'firstName' }),
              createTemplateField({
                name: 'loginPassword',
                options: ['isSecurity'],
              }),
            ];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    const result = await service.findAndCount(
      'salesOpportunity',
      {},
      1,
      25,
      {},
      { handle: 1 } as never,
      ['assigneePerson'],
    );

    expect(result.data).toEqual([
      {
        handle: 7,
        assigneePerson: {
          handle: 1,
          firstName: 'Ada',
        },
      },
    ]);
    expect(assigneePerson.loginPassword).toBe(originalPassword);
  });

  it('keeps top-level rows even when an earlier row references a later row', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const laterRow = {
      handle: 2,
      title: 'Later row',
    };
    const firstRow = {
      handle: 1,
      title: 'First row',
      followUpOpportunity: laterRow,
    };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(
      () => [[firstRow, laterRow], 2] as [object[], number],
    );
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'salesOpportunity':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'title' }),
              createTemplateField({
                name: 'followUpOpportunity',
                isReference: true,
                kind: 'm:1',
                referenceName: 'salesOpportunity',
                referencedPks: ['handle'],
              }),
            ];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    const result = await service.findAndCount(
      'salesOpportunity',
      {},
      1,
      25,
      {},
      { handle: 1 } as never,
      ['followUpOpportunity'],
    );

    expect(result.data).toEqual([
      {
        handle: 1,
        title: 'First row',
        followUpOpportunity: {
          handle: 2,
          title: 'Later row',
        },
      },
      {
        handle: 2,
        title: 'Later row',
      },
    ]);
  });

  it('keeps computed getter fields and shared reference objects during sanitization', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    class TicketRecord {
      handle = 7;
      creatorCompany: Record<string, unknown>;
      creatorPerson: Record<string, unknown>;

      constructor() {
        const sharedCompany = {
          handle: 3,
          name: 'Acme GmbH',
        };

        this.creatorCompany = sharedCompany;
        this.creatorPerson = {
          handle: 5,
          email: 'person@example.com',
          phone: '+49 30 123456',
          company: sharedCompany,
        };
      }

      get creatorPersonEmail(): string | undefined {
        return this.creatorPerson.email as string | undefined;
      }

      get creatorPersonPhone(): string | undefined {
        return this.creatorPerson.phone as string | undefined;
      }
    }

    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(
      () => [[new TicketRecord()], 1] as [object[], number],
    );
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'ticket':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({
                name: 'creatorCompany',
                isReference: true,
                kind: 'm:1',
                referenceName: 'company',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'creatorPerson',
                isReference: true,
                kind: 'm:1',
                referenceName: 'person',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'creatorPersonEmail',
                type: 'string',
                isPersistent: false,
              }),
              createTemplateField({
                name: 'creatorPersonPhone',
                type: 'string',
                isPersistent: false,
              }),
            ];
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'email', type: 'string' }),
              createTemplateField({ name: 'phone', type: 'string' }),
              createTemplateField({
                name: 'company',
                isReference: true,
                kind: 'm:1',
                referenceName: 'company',
                referencedPks: ['handle'],
              }),
            ];
          case 'company':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'name', type: 'string' }),
            ];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    const result = await service.findAndCount(
      'ticket',
      {},
      1,
      25,
      {},
      { handle: 1 } as never,
      ['creatorCompany', 'creatorPerson'],
    );

    expect(result.data).toEqual([
      {
        handle: 7,
        creatorCompany: {
          handle: 3,
          name: 'Acme GmbH',
        },
        creatorPerson: {
          handle: 5,
          email: 'person@example.com',
          phone: '+49 30 123456',
          company: {
            handle: 3,
            name: 'Acme GmbH',
          },
        },
        creatorPersonEmail: 'person@example.com',
        creatorPersonPhone: '+49 30 123456',
      },
    ]);
  });

  it('normalizes shorthand relation operator filters and infers populate relations', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(
      () => [[{ handle: 9 }], 1] as [object[], number],
    );
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({
                name: 'company',
                isReference: true,
                kind: 'm:1',
                referenceName: 'company',
                referencedPks: ['handle'],
              }),
            ];
          case 'company':
            return [createTemplateField({ name: 'handle', type: 'number' })];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    await service.findAndCount(
      'person',
      { company: { $eq: 5 } },
      1,
      25,
      {},
      { handle: 1 } as never,
      [],
    );

    expect(findAndCount.mock.calls[0]).toEqual([
      expect.any(Function),
      { company: { handle: { $eq: 5 } } },
      expect.objectContaining({
        populate: ['company'],
      }),
    ]);
  });

  it('passes the current persisted item into beforeUpdate script context', async () => {
    const item = { handle: 7, title: 'Existing ticket' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'ticket' })
      .mockResolvedValueOnce(item);
    const assign = jest.fn((_item: object, data: object) => ({
      ...item,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    type RunServerMock = (
      method: unknown,
      items: object | object[],
      entity: unknown,
      user: unknown,
      context?: { currentItems?: object[] },
    ) => Promise<ScriptResultServer>;
    const scriptService = {
      runServer: jest
        .fn<RunServerMock>()
        .mockImplementationOnce(
          (
            _method: unknown,
            items: object | object[],
            _entity: unknown,
            _user: unknown,
            context?: { currentItems?: object[] },
          ) => {
            expect(context).toEqual({ currentItems: [item] });
            const nextItem = (
              Array.isArray(items) ? items[0] : items
            ) as Record<string, unknown>;
            return Promise.resolve(
              new ScriptResultServer(
                [
                  {
                    ...nextItem,
                    title: 'Changed',
                  },
                ],
                ScriptResultServerMethods.overwrite,
              ),
            );
          },
        )
        .mockImplementationOnce(
          (_method: unknown, items: object | object[]) => {
            const resultItems: object[] =
              items instanceof Array ? items : [items];
            return Promise.resolve(new ScriptResultServer(resultItems));
          },
        ),
    };
    const em = {
      findOne,
      assign,
      flush,
    };
    const templateService = {
      getEntityTemplate: jest.fn(() => [
        createTemplateField({ name: 'title' }),
      ]),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    const result = await service.update(
      'ticket',
      7,
      { title: 'Input' },
      { handle: 1 } as never,
      [],
    );

    expect(scriptService.runServer).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(item, { title: 'Changed' });
    expect(result).toMatchObject({ handle: 7, title: 'Changed' });
  });

  it('does not auto-populate all relations during update when none were requested', async () => {
    const item = { handle: 7, phone: '+49 1111111111' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'person' })
      .mockResolvedValueOnce(item);
    const assign = jest.fn((_item: object, data: object) => ({
      ...item,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const em = {
      findOne,
      assign,
      flush,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'phone', type: 'string' }),
              createTemplateField({
                name: 'roles',
                isReference: true,
                kind: 'm:n',
                referenceName: 'role',
                referencedPks: ['handle'],
              }),
            ];
          default:
            return [];
        }
      }),
    };
    const scriptService = {
      runServer: jest.fn((_method: unknown, items: object | object[]) =>
        Promise.resolve(
          new ScriptResultServer(Array.isArray(items) ? items : [items]),
        ),
      ),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    await service.update(
      'person',
      7,
      {
        phone: '+49 1234567890',
      },
      { handle: 1 } as never,
      [],
    );

    expect(findOne.mock.calls[1]?.[2]).toEqual({
      populate: [],
    });
  });

  it('drops inverse one-to-many relations from update payloads before assign', async () => {
    const item = { handle: 7, phone: '+49 1111111111' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'person' })
      .mockResolvedValueOnce(item);
    const assign = jest.fn((_item: object, data: object) => ({
      ...item,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const em = {
      findOne,
      assign,
      flush,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'phone', type: 'string' }),
              createTemplateField({
                name: 'createdTickets',
                isReference: true,
                kind: '1:m',
                referenceName: 'ticket',
                referencedPks: ['handle'],
              }),
            ];
          default:
            return [];
        }
      }),
    };
    const scriptService = {
      runServer: jest.fn((_method: unknown, items: object | object[]) =>
        Promise.resolve(
          new ScriptResultServer(Array.isArray(items) ? items : [items]),
        ),
      ),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    const result = await service.update(
      'person',
      7,
      {
        phone: '+49 1234567890',
        createdTickets: [{ handle: 1 }, { handle: 2 }],
      },
      { handle: 1 } as never,
      [],
    );

    expect(assign).toHaveBeenCalledWith(item, {
      phone: '+49 1234567890',
    });
    expect(result).toMatchObject({
      handle: 7,
      phone: '+49 1234567890',
    });
  });

  it('logs the submitted update payload without reusing the persisted entity state', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(
      (...args: unknown[]) =>
        args[1] === 'loginPassword' && args[2] === 'isSecurity',
    );

    const item = {
      handle: 7,
      phone: '+49 1111111111',
      loginPassword: 'hashed-secret',
      roles: {
        isInitialized: () => true,
        toArray: () => [{ handle: 5, name: 'Admin' }],
      },
    };
    const persistedItem = {
      ...item,
      phone: '+49 1234567890',
    };
    const changeLogDetailsAdd = jest.fn();
    const logCreateCalls: Array<Record<string, unknown>> = [];
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'person' })
      .mockResolvedValueOnce(item);
    const assign = jest.fn((_item: object, data: object) => ({
      ...persistedItem,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const logEm = {
      create: jest.fn((cls: unknown, data: Record<string, unknown>) => {
        if ('action' in data) {
          logCreateCalls.push(data);
          return {
            ...data,
            details: {
              add: changeLogDetailsAdd,
            },
          };
        }

        return data;
      }),
      flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      getReference: jest.fn((_cls: unknown, handle: string | number) => ({
        handle,
      })),
    };
    const em = {
      findOne,
      assign,
      flush,
      create: logEm.create,
      fork: jest.fn(() => logEm),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'phone', type: 'string' }),
              createTemplateField({
                name: 'loginPassword',
                options: ['isSecurity'],
              }),
              createTemplateField({
                name: 'roles',
                isReference: true,
                kind: 'm:n',
                referenceName: 'role',
                referencedPks: ['handle'],
              }),
            ];
          case 'role':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'name', type: 'string' }),
            ];
          default:
            return [];
        }
      }),
    };
    const scriptService = {
      runServer: jest.fn((_method: unknown, items: object | object[]) =>
        Promise.resolve(
          new ScriptResultServer(Array.isArray(items) ? items : [items]),
        ),
      ),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    await service.update(
      'person',
      7,
      {
        handle: 7,
        phone: '+49 1234567890',
      },
      { handle: 1 } as never,
      [],
    );

    expect(logCreateCalls).toHaveLength(1);
    expect(logCreateCalls[0]).toMatchObject({
      action: 'update',
      reference: '7',
      oldPayload: {
        handle: 7,
        phone: '+49 1111111111',
      },
      newPayload: {
        handle: 7,
        phone: '+49 1234567890',
      },
    });
    expect(logCreateCalls[0]?.oldPayload).not.toHaveProperty('loginPassword');
    expect(logCreateCalls[0]?.newPayload).not.toHaveProperty('roles');
  });

  it('projects old update payload references to the same flat shape as the submitted payload', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(
      (...args: unknown[]) =>
        args[1] === 'loginPassword' && args[2] === 'isSecurity',
    );

    const item = {
      handle: 1,
      phone: '+49 1234 567890',
      mobile: '+49 1234 567891',
      email: 'info@standardfirma.de',
      firstName: 'Max',
      lastName: 'Mustermann',
      loginName: 'max-mustermann',
      loginPassword: 'hashed-secret',
      type: { handle: 'sapling', color: '#4CAF50', icon: null },
      company: { handle: 1, name: null },
      language: { handle: 'de', name: null },
      workWeek: { handle: 1, title: null },
      holidayGroup: { handle: 2, title: null },
      roles: [],
      notes: [],
      mailLists: [],
      sharedMailboxGroups: [],
      apiTokens: [],
      documents: [],
      favorites: [],
      dashboards: [],
      createdEvents: [],
      createdTickets: [],
      createdSalesOpportunities: [],
      session: null,
      birthDay: new Date('1990-09-23T00:00:00.000Z'),
      isActive: true,
      sendNewsletter: true,
      requirePasswordChange: false,
      createdAt: new Date('2026-05-12T08:38:28.667Z'),
      updatedAt: new Date('2026-05-12T08:38:28.667Z'),
    };
    const changeLogDetailsAdd = jest.fn();
    const logCreateCalls: Array<Record<string, unknown>> = [];
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'person' })
      .mockResolvedValueOnce(item);
    const assign = jest.fn((_item: object, data: object) => ({
      ...item,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const logEm = {
      create: jest.fn((cls: unknown, data: Record<string, unknown>) => {
        if ('action' in data) {
          logCreateCalls.push(data);
          return {
            ...data,
            details: {
              add: changeLogDetailsAdd,
            },
          };
        }

        return data;
      }),
      flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const em = {
      findOne,
      assign,
      flush,
      create: logEm.create,
      fork: jest.fn(() => logEm),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'phone', type: 'string' }),
              createTemplateField({ name: 'mobile', type: 'string' }),
              createTemplateField({ name: 'email', type: 'string' }),
              createTemplateField({ name: 'firstName', type: 'string' }),
              createTemplateField({ name: 'lastName', type: 'string' }),
              createTemplateField({ name: 'loginName', type: 'string' }),
              createTemplateField({
                name: 'loginPassword',
                options: ['isSecurity'],
              }),
              createTemplateField({
                name: 'type',
                isReference: true,
                kind: 'm:1',
                referenceName: 'personType',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'company',
                isReference: true,
                kind: 'm:1',
                referenceName: 'company',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'language',
                isReference: true,
                kind: 'm:1',
                referenceName: 'language',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'workWeek',
                isReference: true,
                kind: 'm:1',
                referenceName: 'workHourWeek',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'holidayGroup',
                isReference: true,
                kind: 'm:1',
                referenceName: 'holidayGroup',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'roles',
                isReference: true,
                kind: 'm:n',
                referenceName: 'role',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'notes',
                isReference: true,
                kind: '1:m',
                referenceName: 'note',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'mailLists',
                isReference: true,
                kind: 'm:n',
                referenceName: 'emailList',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'sharedMailboxGroups',
                isReference: true,
                kind: 'm:n',
                referenceName: 'sharedMailboxGroup',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'apiTokens',
                isReference: true,
                kind: '1:m',
                referenceName: 'personApiToken',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'documents',
                isReference: true,
                kind: '1:m',
                referenceName: 'document',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'favorites',
                isReference: true,
                kind: '1:m',
                referenceName: 'favorite',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'dashboards',
                isReference: true,
                kind: '1:m',
                referenceName: 'dashboard',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'createdEvents',
                isReference: true,
                kind: '1:m',
                referenceName: 'event',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'createdTickets',
                isReference: true,
                kind: '1:m',
                referenceName: 'ticket',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'createdSalesOpportunities',
                isReference: true,
                kind: '1:m',
                referenceName: 'salesOpportunity',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'session',
                isReference: true,
                kind: '1:1',
                referenceName: 'personSession',
                referencedPks: ['handle'],
              }),
              createTemplateField({ name: 'birthDay', type: 'date' }),
              createTemplateField({ name: 'isActive', type: 'boolean' }),
              createTemplateField({
                name: 'sendNewsletter',
                type: 'boolean',
              }),
              createTemplateField({
                name: 'requirePasswordChange',
                type: 'boolean',
              }),
              createTemplateField({ name: 'createdAt', type: 'date' }),
              createTemplateField({ name: 'updatedAt', type: 'date' }),
            ];
          default:
            return [];
        }
      }),
    };
    const scriptService = {
      runServer: jest.fn((_method: unknown, items: object | object[]) =>
        Promise.resolve(
          new ScriptResultServer(Array.isArray(items) ? items : [items]),
        ),
      ),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    await service.update(
      'person',
      1,
      {
        type: 'sapling',
        color: '#4CAF50',
        email: 'info@standardfirma.de',
        notes: [],
        phone: '+49 1234567890',
        roles: [],
        handle: 1,
        mobile: '+49 1234567891',
        company: 1,
        session: null,
        birthDay: '1990-09-23T00:00:00.000Z',
        isActive: true,
        language: 'de',
        lastName: 'Mustermann',
        workWeek: 1,
        apiTokens: [],
        createdAt: '2026-05-12T08:38:00.000Z',
        documents: [],
        favorites: [],
        firstName: 'Max',
        loginName: 'max-mustermann',
        mailLists: [],
        updatedAt: '2026-05-12T08:38:00.000Z',
        dashboards: [],
        department: null,
        holidayGroup: 2,
        createdEvents: [],
        loginPassword: '',
        createdTickets: [],
        sendNewsletter: true,
        sharedMailboxGroups: [],
        requirePasswordChange: false,
        createdSalesOpportunities: [],
      },
      { handle: 1 } as never,
      [],
    );

    expect(logCreateCalls[0]?.oldPayload).toMatchObject({
      type: 'sapling',
      phone: '+49 1234 567890',
      mobile: '+49 1234 567891',
      company: 1,
      language: 'de',
      workWeek: 1,
      holidayGroup: 2,
      loginPassword: '',
      createdTickets: [],
      createdEvents: [],
      createdSalesOpportunities: [],
      roles: [],
      notes: [],
      session: null,
    });
  });

  it('does not fail the update when change log persistence throws', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const item = { handle: 7, phone: '+49 1111111111' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'person' })
      .mockResolvedValueOnce(item);
    const assign = jest.fn((_item: object, data: object) => ({
      ...item,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const logEm = {
      create: jest.fn((cls: unknown, data: Record<string, unknown>) => {
        if ('action' in data) {
          return {
            ...data,
            details: {
              add: jest.fn(),
            },
          };
        }

        return data;
      }),
      flush: jest
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error('log failed')),
      getReference: jest.fn((_cls: unknown, handle: string | number) => ({
        handle,
      })),
    };
    const em = {
      findOne,
      assign,
      flush,
      create: logEm.create,
      fork: jest.fn(() => logEm),
    };
    const templateService = {
      getEntityTemplate: jest.fn(() => [
        createTemplateField({ name: 'handle', type: 'number' }),
        createTemplateField({ name: 'phone', type: 'string' }),
      ]),
    };
    const scriptService = {
      runServer: jest.fn((_method: unknown, items: object | object[]) =>
        Promise.resolve(
          new ScriptResultServer(Array.isArray(items) ? items : [items]),
        ),
      ),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    const result = await service.update(
      'person',
      7,
      {
        phone: '+49 1234567890',
      },
      { handle: 1 } as never,
      [],
    );

    expect(assign).toHaveBeenCalledWith(item, {
      phone: '+49 1234567890',
    });
    expect(result).toMatchObject({
      handle: 7,
      phone: '+49 1234567890',
    });
  });

  it('normalizes relation filters to referenced string primary keys', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(
      () => [[{ handle: 9 }], 1] as [object[], number],
    );
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'aiChatSession':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({
                name: 'model',
                isReference: true,
                kind: 'm:1',
                referenceName: 'aiProviderModel',
                referencedPks: ['handle'],
              }),
            ];
          case 'aiProviderModel':
            return [createTemplateField({ name: 'handle', type: 'string' })];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    await service.findAndCount(
      'aiChatSession',
      { model: { $eq: 6 } },
      1,
      25,
      {},
      { handle: 1 } as never,
      [],
    );

    expect(findAndCount.mock.calls[0]).toEqual([
      expect.any(Function),
      { model: { handle: { $eq: '6' } } },
      expect.objectContaining({
        populate: ['model'],
      }),
    ]);
  });

  it('breaks circular person session references into handle-only fallbacks', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(
      (...args: unknown[]) =>
        (args[1] === 'accessToken' || args[1] === 'refreshToken') &&
        args[2] === 'isSecurity',
    );

    const person = {
      handle: 1,
      firstName: 'Ada',
    } as Record<string, unknown>;
    const session = {
      handle: 99,
      number: 'session-99',
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token',
      person,
    } as Record<string, unknown>;
    person.session = session;
    person.roles = {
      isInitialized: () => true,
      toArray: () => [{ handle: 5, name: 'Admin' }],
    };

    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const findAndCount = jest.fn(() => [[person], 1] as [object[], number]);
    const em = {
      findOne,
      findAndCount,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'firstName', type: 'string' }),
              createTemplateField({
                name: 'session',
                isReference: true,
                kind: '1:1',
                referenceName: 'personSession',
                referencedPks: ['handle'],
              }),
              createTemplateField({
                name: 'roles',
                isReference: true,
                kind: 'm:n',
                referenceName: 'role',
                referencedPks: ['handle'],
              }),
            ];
          case 'personSession':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'number', type: 'string' }),
              createTemplateField({
                name: 'accessToken',
                options: ['isSecurity'],
              }),
              createTemplateField({
                name: 'refreshToken',
                options: ['isSecurity'],
              }),
              createTemplateField({
                name: 'person',
                isReference: true,
                kind: '1:1',
                referenceName: 'person',
                referencedPks: ['handle'],
              }),
            ];
          case 'role':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'name', type: 'string' }),
            ];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    const result = await service.findAndCount(
      'person',
      {},
      1,
      25,
      {},
      { handle: 1 } as never,
      ['roles'],
    );

    expect(result.data).toEqual([
      {
        handle: 1,
        firstName: 'Ada',
        session: {
          handle: 99,
          number: 'session-99',
          person: {
            handle: 1,
          },
        },
        roles: [
          {
            handle: 5,
            name: 'Admin',
          },
        ],
      },
    ]);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('does not reload newly created records after flush by default', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const createdRecord = {
      handle: 42,
      title: 'Neuer Datensatz',
    };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValue(null);
    const em = {
      findOne,
      create: jest.fn(() => createdRecord),
      flush: jest.fn(() => Promise.resolve(undefined)),
    };
    const templateService = {
      getEntityTemplate: jest.fn(() => [
        createTemplateField({ name: 'handle', type: 'number' }),
        createTemplateField({ name: 'title', type: 'string' }),
      ]),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowInsertStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    const result = await service.create(
      'ticket',
      { title: 'Neuer Datensatz' },
      { handle: 1 } as never,
    );

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      handle: 42,
      title: 'Neuer Datensatz',
    });
  });

  it('does not reload deleted records before the after-delete handoff', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({
        handle: 9,
        title: 'Zu loeschender Datensatz',
      })
      .mockResolvedValueOnce(null);
    const nativeDelete = jest
      .fn<(entity: unknown, where: { handle: number }) => Promise<number>>()
      .mockResolvedValue(1);
    const em = {
      findOne,
      nativeDelete,
    };
    const templateService = {
      getEntityTemplate: jest.fn(() => [
        createTemplateField({ name: 'handle', type: 'number' }),
        createTemplateField({ name: 'title', type: 'string' }),
      ]),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowDeleteStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    await service.delete('ticket', 9, { handle: 1 } as never);

    expect(findOne).toHaveBeenCalledTimes(2);
    expect(nativeDelete).toHaveBeenCalledWith(expect.any(Function), {
      handle: 9,
    });
  });

  it('does not auto-populate all relations during delete', async () => {
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({
        handle: 9,
        title: 'Zu loeschender Datensatz',
      })
      .mockResolvedValueOnce(null);
    const nativeDelete = jest
      .fn<(entity: unknown, where: { handle: number }) => Promise<number>>()
      .mockResolvedValue(1);
    const em = {
      findOne,
      nativeDelete,
    };
    const templateService = {
      getEntityTemplate: jest.fn(() => [
        createTemplateField({ name: 'handle', type: 'number' }),
        createTemplateField({ name: 'title', type: 'string' }),
        createTemplateField({
          name: 'roles',
          isReference: true,
          kind: 'm:n',
          referenceName: 'role',
          referencedPks: ['handle'],
        }),
      ]),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowDeleteStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
    });

    await service.delete('person', 9, { handle: 1 } as never);

    expect(findOne.mock.calls[0]).toEqual([
      expect.any(Function),
      { handle: 9 },
    ]);
  });

  it('runs addReference scripts with relation context after the reference flush', async () => {
    const relation = {
      init: jest
        .fn<(...args: unknown[]) => Promise<undefined>>()
        .mockResolvedValue(undefined),
      add: jest.fn(),
      remove: jest.fn(),
    };
    const item = {
      handle: 7,
      tags: relation,
      title: 'Existing ticket',
    };
    const referenceItem = { handle: 3, name: 'Important' };
    const entity = { handle: 'ticket' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce(entity)
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(referenceItem);
    const assign = jest.fn((target: object, data: object) => ({
      ...target,
      ...data,
    }));
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const scriptService = {
      runServer: jest.fn(
        (
          method: unknown,
          items: object | object[],
          _entity: unknown,
          _user: unknown,
          context?: { referenceName?: string; referenceItems?: object[] },
        ) => {
          expect(method).toBe(ScriptMethods.addReference);
          expect(context).toEqual({
            referenceName: 'tags',
            referenceItems: [referenceItem],
          });
          const scriptItems = Array.isArray(items) ? items : [items];
          return Promise.resolve(
            new ScriptResultServer(
              [
                {
                  ...(scriptItems[0] as Record<string, unknown>),
                  title: 'Updated by addReference hook',
                },
              ],
              ScriptResultServerMethods.overwrite,
            ),
          );
        },
      ),
    };
    const em = {
      findOne,
      assign,
      flush,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'ticket':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'title', type: 'string' }),
              createTemplateField({
                name: 'tags',
                isReference: true,
                kind: 'm:n',
                referenceName: 'tag',
                referencedPks: ['handle'],
              }),
            ];
          case 'tag':
            return [createTemplateField({ name: 'handle', type: 'number' })];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    const result = await service.createReference('ticket', 'tags', 7, 3, {
      handle: 1,
    } as never);

    expect(relation.init).toHaveBeenCalledWith({ where: { handle: 3 } });
    expect(relation.add).toHaveBeenCalledWith(referenceItem);
    expect(assign).toHaveBeenCalledWith(item, {
      handle: 7,
      tags: relation,
      title: 'Updated by addReference hook',
    });
    expect(result).toMatchObject({
      handle: 7,
      title: 'Updated by addReference hook',
    });
  });

  it('runs deleteReference scripts with relation context after the reference flush', async () => {
    const relation = {
      init: jest
        .fn<(...args: unknown[]) => Promise<undefined>>()
        .mockResolvedValue(undefined),
      add: jest.fn(),
      remove: jest.fn(),
    };
    const item = {
      handle: 7,
      tags: relation,
      title: 'Existing ticket',
    };
    const referenceItem = { handle: 3, name: 'Important' };
    const entity = { handle: 'ticket' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce(entity)
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(referenceItem);
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const scriptService = {
      runServer: jest.fn(
        (
          method: unknown,
          _items: object | object[],
          _entity: unknown,
          _user: unknown,
          context?: { referenceName?: string; referenceItems?: object[] },
        ) => {
          expect(method).toBe(ScriptMethods.deleteReference);
          expect(context).toEqual({
            referenceName: 'tags',
            referenceItems: [referenceItem],
          });
          return Promise.resolve(new ScriptResultServer([item]));
        },
      ),
    };
    const em = {
      findOne,
      assign: jest.fn(),
      flush,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'ticket':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'title', type: 'string' }),
              createTemplateField({
                name: 'tags',
                isReference: true,
                kind: 'm:n',
                referenceName: 'tag',
                referencedPks: ['handle'],
              }),
            ];
          case 'tag':
            return [createTemplateField({ name: 'handle', type: 'number' })];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    const result = await service.deleteReference('ticket', 'tags', 7, 3, {
      handle: 1,
    } as never);

    expect(relation.init).toHaveBeenCalledWith({ where: { handle: 3 } });
    expect(relation.remove).toHaveBeenCalledWith(referenceItem);
    expect(result).toMatchObject({
      handle: 7,
      title: 'Existing ticket',
    });
  });

  it('loads timeline relation records only once per descriptor across multiple months', async () => {
    (hasSaplingOption as jest.Mock).mockImplementation(() => false);

    ENTITY_REGISTRY.splice(0, ENTITY_REGISTRY.length, {
      name: 'ticket',
    } as never);

    const findOne = jest
      .fn<() => Promise<Record<string, unknown> | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        handle: 7,
        firstName: 'Ada',
        createdAt: new Date('2026-04-10T12:00:00.000Z'),
        updatedAt: new Date('2026-04-10T12:00:00.000Z'),
      })
      .mockResolvedValueOnce(null);
    const find = jest
      .fn<() => Promise<Record<string, unknown>[]>>()
      .mockResolvedValue([
        {
          handle: 101,
          title: 'April ticket',
          assigneePerson: { handle: 7 },
          isEscalated: true,
          createdAt: new Date('2026-04-12T09:00:00.000Z'),
          updatedAt: new Date('2026-04-15T09:00:00.000Z'),
        },
        {
          handle: 102,
          title: 'March ticket',
          assigneePerson: { handle: 7 },
          isEscalated: false,
          createdAt: new Date('2026-03-05T09:00:00.000Z'),
          updatedAt: new Date('2026-03-08T09:00:00.000Z'),
        },
      ]);
    const em = {
      findOne,
      find,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'firstName', type: 'string' }),
              createTemplateField({ name: 'createdAt', type: 'date' }),
              createTemplateField({ name: 'updatedAt', type: 'date' }),
            ];
          case 'ticket':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'title', type: 'string' }),
              createTemplateField({ name: 'createdAt', type: 'date' }),
              createTemplateField({ name: 'updatedAt', type: 'date' }),
              createTemplateField({
                name: 'assigneePerson',
                isReference: true,
                kind: 'm:1',
                referenceName: 'person',
                referencedPks: ['handle'],
                options: ['isPerson'],
              }),
              createTemplateField({
                name: 'isEscalated',
                type: 'boolean',
              }),
            ];
          default:
            return [];
        }
      }),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowRead: true,
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const scriptService = {
      runServer: jest.fn((_method: unknown, items: unknown) =>
        Promise.resolve({
          items,
        }),
      ),
    };
    const service = createGenericService({
      em,
      templateService,
      currentService,
      scriptService,
    });

    const result = await service.getRecordTimeline(
      'person',
      7,
      { handle: 7 } as unknown as never,
      '2026-04',
      2,
    );

    expect(find).toHaveBeenCalledTimes(1);
    expect(result.months).toHaveLength(2);
    expect(result.months.map((month) => month.key)).toEqual([
      '2026-04',
      '2026-03',
    ]);
    expect(result.months[0]?.entities[0]?.count).toBe(1);
    expect(result.months[1]?.entities[0]?.count).toBe(1);

    ENTITY_REGISTRY.splice(0, ENTITY_REGISTRY.length);
  });
});
