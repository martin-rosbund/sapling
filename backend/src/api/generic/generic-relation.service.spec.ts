import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericRelationService } from './generic-relation.service';
import { GenericSanitizerService } from './generic-sanitizer.service';

jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_MAP: {
    ticket: class TicketItem {},
    tag: class TagItem {},
  },
  ENTITY_REGISTRY: [],
}));

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

describe('GenericRelationService', () => {
  it('adds references through the relation collection and flushes once', async () => {
    const add = jest.fn();
    const init = jest.fn(() => Promise.resolve(undefined));
    const relation = {
      init,
      add,
      remove: jest.fn(),
    };
    const item = {
      handle: 7,
      tags: relation,
    };
    const referenceItem = { handle: 3, name: 'Important' };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(referenceItem);
    const flush = jest.fn(() => Promise.resolve(undefined));
    const em = {
      findOne,
      flush,
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'ticket':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
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
    const queryService = new GenericQueryService(templateService as never);
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
    const sanitizerService = new GenericSanitizerService(
      templateService as never,
    );
    const service = new GenericRelationService(
      em as never,
      templateService as never,
      permissionService,
      queryService,
      referenceService,
      sanitizerService,
    );

    const result = await service.createReference('ticket', 'tags', 7, 3, {
      handle: 1,
    } as never);

    expect(init).toHaveBeenCalledWith({ where: { handle: 3 } });
    expect(add).toHaveBeenCalledWith(referenceItem);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(result).toEqual(item);
  });

  it('throws when the referenced record is not accessible', async () => {
    const item = {
      handle: 7,
      tags: {
        init: jest.fn(),
        add: jest.fn(),
        remove: jest.fn(),
      },
    };
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(null);
    const em = {
      findOne,
      flush: jest.fn(() => Promise.resolve(undefined)),
    };
    const templateService = {
      getEntityTemplate: jest.fn(() => [
        createTemplateField({ name: 'handle', type: 'number' }),
        createTemplateField({
          name: 'tags',
          isReference: true,
          kind: 'm:n',
          referenceName: 'tag',
          referencedPks: ['handle'],
        }),
      ]),
    };
    const currentService = {
      getEntityPermissions: jest.fn(() => ({
        allowUpdateStage: 'global',
      })),
      getAllEntityPermissions: jest.fn(() => []),
    };
    const queryService = new GenericQueryService(templateService as never);
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
    const sanitizerService = new GenericSanitizerService(
      templateService as never,
    );
    const service = new GenericRelationService(
      em as never,
      templateService as never,
      permissionService,
      queryService,
      referenceService,
      sanitizerService,
    );

    await expect(
      service.deleteReference('ticket', 'tags', 7, 4, { handle: 1 } as never),
    ).rejects.toThrow(NotFoundException);
  });
});
