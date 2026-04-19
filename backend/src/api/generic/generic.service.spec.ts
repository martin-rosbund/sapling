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
  },
  ENTITY_REGISTRY: [],
}));
jest.mock('../../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../current/current.service', () => ({ CurrentService: class {} }));
jest.mock('../template/template.service', () => ({ TemplateService: class {} }));
jest.mock('../script/script.service', () => ({
  ScriptService: class {},
  ScriptMethods: {},
}));

import { GenericService } from './generic.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { hasSaplingOption } from '../../entity/global/entity.decorator';

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
  ...overrides,
});

describe('GenericService', () => {
  it('normalizes dotted relation filters and infers populate relations', async () => {
    ;(hasSaplingOption as jest.Mock).mockImplementation(() => false)

    const findOne = jest.fn(async (..._args: unknown[]) => null)
    const findAndCount = jest.fn(
      async (..._args: unknown[]) => [[{ handle: 7 }], 1] as [object[], number],
    )
    const em = {
      findOne,
      findAndCount,
    }
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
    ])
  });

  it('sanitizes security fields without mutating managed relation objects', async () => {
    ;(hasSaplingOption as jest.Mock).mockImplementation(
      (...args: unknown[]) => args[1] === 'loginPassword' && args[2] === 'isSecurity',
    )

    const originalPassword = 'hashed-secret'
    const assigneePerson = {
      handle: 1,
      firstName: 'Ada',
      loginPassword: originalPassword,
    }
    const findOne = jest.fn(async (..._args: unknown[]) => null)
    const findAndCount = jest.fn(
      async (..._args: unknown[]) =>
        [
          [
            {
              handle: 7,
              assigneePerson,
            },
          ],
          1,
        ] as [object[], number],
    )
    const em = {
      findOne,
      findAndCount,
    }
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
            ]
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'firstName' }),
              createTemplateField({
                name: 'loginPassword',
                options: ['isSecurity'],
              }),
            ]
          default:
            return []
        }
      }),
    }
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    }
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    )

    const result = await service.findAndCount(
      'salesOpportunity',
      {},
      1,
      25,
      {},
      { handle: 1 } as never,
      ['assigneePerson'],
    )

    expect(result.data).toEqual([
      {
        handle: 7,
        assigneePerson: {
          handle: 1,
          firstName: 'Ada',
        },
      },
    ])
    expect(assigneePerson.loginPassword).toBe(originalPassword)
  })

  it('keeps top-level rows even when an earlier row references a later row', async () => {
    ;(hasSaplingOption as jest.Mock).mockImplementation(() => false)

    const laterRow = {
      handle: 2,
      title: 'Later row',
    }
    const firstRow = {
      handle: 1,
      title: 'First row',
      followUpOpportunity: laterRow,
    }
    const findOne = jest.fn(async (..._args: unknown[]) => null)
    const findAndCount = jest.fn(
      async (..._args: unknown[]) => [[firstRow, laterRow], 2] as [object[], number],
    )
    const em = {
      findOne,
      findAndCount,
    }
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
            ]
          default:
            return []
        }
      }),
    }
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowReadStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    }
    const service = new GenericService(
      em as never,
      templateService as never,
      currentService as never,
      {} as never,
    )

    const result = await service.findAndCount(
      'salesOpportunity',
      {},
      1,
      25,
      {},
      { handle: 1 } as never,
      ['followUpOpportunity'],
    )

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
    ])
  })
});