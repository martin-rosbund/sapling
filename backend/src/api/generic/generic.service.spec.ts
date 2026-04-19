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
    const em = {
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[{ handle: 7 }], 1]),
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

    expect(em.findAndCount).toHaveBeenCalledWith(
      expect.any(Function),
      { assigneePerson: { handle: { $eq: 1 } } },
      expect.objectContaining({
        populate: ['assigneePerson'],
      }),
    );
  });
});