import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({
  EntityManager: class {},
}));
jest.mock('../../entity/global/entity.decorator', () => ({
  hasSaplingOption: jest.fn(() => false),
}));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_MAP: {
    salesOpportunity: class SalesOpportunityItem {},
    person: class PersonItem {},
    personSession: class PersonSessionItem {},
    company: class CompanyItem {},
    ticket: class TicketItem {},
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
  ScriptMethods: {},
}));

import { GenericService } from './generic.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { hasSaplingOption } from '../../entity/global/entity.decorator';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';

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
  formOrder: null,
  formWidth: null,
  ...overrides,
});

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    );

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
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      scriptService as never,
    );

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
