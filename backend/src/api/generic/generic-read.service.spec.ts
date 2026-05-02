import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';
import { GenericReadService } from './generic-read.service';

(global as { log?: { error: jest.Mock } }).log = {
  error: jest.fn(),
};

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

describe('GenericReadService', () => {
  it('runs beforeRead scripts and normalizes criteria before fetching collections', async () => {
    const findOne = jest
      .fn<() => Promise<object | null>>()
      .mockResolvedValueOnce({ handle: 'ticket' });
    const find = jest
      .fn<() => Promise<object[]>>()
      .mockResolvedValue([{ handle: 1, title: 'Ada' }]);
    const em = {
      findOne,
      find,
    };
    const scriptService = {
      runServer: jest.fn(() =>
        Promise.resolve({
          items: {
            title: { $like: '%Ada%' },
            createdAt: { $gte: '2026-04-01' },
          },
        }),
      ),
    };
    const permissionService = {
      setTopLevelFilter: jest.fn((where: object) => where),
    };
    const service = new GenericReadService(
      em as never,
      scriptService as never,
      new GenericFilterService(),
      permissionService as never,
    );
    const template = [
      createTemplateField({ name: 'title', type: 'string' }),
      createTemplateField({ name: 'createdAt', type: 'date' }),
    ];

    await service.find(
      'ticket',
      () => undefined,
      {},
      { handle: 1 } as never,
      template,
      {},
    );

    expect(scriptService.runServer).toHaveBeenCalled();
    expect(find.mock.calls[0]?.[1]).toEqual({
      title: { $ilike: '%Ada%' },
      createdAt: { $gte: new Date('2026-04-01') },
    });
  });

  it('skips beforeRead scripts when disabled', async () => {
    const em = {
      findOne: jest.fn(() => Promise.resolve({ handle: 'ticket' })),
      find: jest.fn(() => Promise.resolve([])),
    };
    const scriptService = {
      runServer: jest.fn(),
    };
    const permissionService = {
      setTopLevelFilter: jest.fn((where: object) => where),
    };
    const service = new GenericReadService(
      em as never,
      scriptService as never,
      new GenericFilterService(),
      permissionService as never,
    );

    await service.find(
      'ticket',
      () => undefined,
      {},
      { handle: 1 } as never,
      [createTemplateField({ name: 'title', type: 'string' })],
      { runBeforeReadScript: false },
    );

    expect(scriptService.runServer).not.toHaveBeenCalled();
  });

  it('skips entity metadata lookups and read scripts when no entity script exists', async () => {
    const em = {
      findOne: jest.fn(() => Promise.resolve({ handle: 'ticket' })),
      findAndCount: jest.fn(() => Promise.resolve([[], 0])),
    };
    const scriptService = {
      hasEntityScript: jest.fn(() => false),
      runServer: jest.fn(),
    };
    const permissionService = {
      setTopLevelFilter: jest.fn((where: object) => where),
    };
    const service = new GenericReadService(
      em as never,
      scriptService as never,
      new GenericFilterService(),
      permissionService as never,
    );

    const result = await service.findAndCount(
      'ticket',
      () => undefined,
      {},
      { handle: 1 } as never,
      [createTemplateField({ name: 'title', type: 'string' })],
      {},
    );

    expect(em.findOne).not.toHaveBeenCalled();
    expect(scriptService.runServer).not.toHaveBeenCalled();
    expect(result.entity).toBeNull();
  });

  it('still loads entity metadata when afterRead scripts may run', async () => {
    const em = {
      findOne: jest.fn(() => Promise.resolve({ handle: 'ticket' })),
      findAndCount: jest.fn(() => Promise.resolve([[], 0])),
    };
    const scriptService = {
      hasEntityScript: jest.fn(() => true),
      runServer: jest.fn(() =>
        Promise.resolve({
          items: {},
        }),
      ),
    };
    const permissionService = {
      setTopLevelFilter: jest.fn((where: object) => where),
    };
    const service = new GenericReadService(
      em as never,
      scriptService as never,
      new GenericFilterService(),
      permissionService as never,
    );

    const result = await service.findAndCount(
      'ticket',
      () => undefined,
      {},
      { handle: 1 } as never,
      [createTemplateField({ name: 'title', type: 'string' })],
      {},
    );

    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), {
      handle: 'ticket',
    });
    expect(result.entity).toEqual({ handle: 'ticket' });
  });

  it('maps read failures to bad requests', async () => {
    const em = {
      findOne: jest.fn(() => Promise.resolve(null)),
      findAndCount: jest.fn(() => Promise.reject(new TypeError('broken read'))),
    };
    const permissionService = {
      setTopLevelFilter: jest.fn((where: object) => where),
    };
    const service = new GenericReadService(
      em as never,
      {} as never,
      new GenericFilterService(),
      permissionService as never,
    );

    await expect(
      service.findAndCount(
        'ticket',
        () => undefined,
        {},
        { handle: 1 } as never,
        [],
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
