import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from '../../script/core/script.result.server';
import { ScriptMethods } from '../script/script.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';
import { GenericMutationService } from './generic-mutation.service';

(global as unknown as { log?: { error: jest.Mock } }).log = {
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

describe('GenericMutationService', () => {
  it('applies overwrite results from before scripts', async () => {
    const em = {};
    const scriptService = {
      runServer: jest.fn(() =>
        Promise.resolve(
          new ScriptResultServer(
            [{ title: 'Changed by script' }],
            ScriptResultServerMethods.overwrite,
          ),
        ),
      ),
    };
    const service = new GenericMutationService(
      em as never,
      scriptService as never,
      new GenericFilterService(),
    );

    const result = await service.applyBeforeScript(
      ScriptMethods.beforeInsert,
      { title: 'Original' },
      { handle: 'ticket' } as never,
      { handle: 1 } as never,
    );

    expect(result).toEqual({ title: 'Changed by script' });
  });

  it('persists overwritten after-script payloads through assign and flush', async () => {
    const item = { handle: 7, startAt: new Date('2026-04-29T09:00:00.000Z') };
    const assign = jest.fn((_item: object, data: object) => ({
      ...item,
      ...data,
    }));
    const flush = jest.fn(() => Promise.resolve(undefined));
    const em = {
      assign,
      flush,
    };
    const scriptService = {
      runServer: jest.fn(() =>
        Promise.resolve(
          new ScriptResultServer(
            [{ startAt: '2026-04-30T10:00:00.000Z' }],
            ScriptResultServerMethods.overwrite,
          ),
        ),
      ),
    };
    const service = new GenericMutationService(
      em as never,
      scriptService as never,
      new GenericFilterService(),
    );
    const template = [
      createTemplateField({ name: 'startAt', type: 'datetime' }),
    ];

    const overwritten = await service.applyAfterScript(
      ScriptMethods.afterUpdate,
      item,
      { handle: 'ticket' } as never,
      { handle: 1 } as never,
    );
    const persisted = await service.assignAndFlush(
      'ticket',
      item,
      overwritten,
      template,
    );

    expect(assign).toHaveBeenCalledWith(item, {
      startAt: new Date('2026-04-30T10:00:00.000Z'),
    });
    expect(flush).toHaveBeenCalled();
    expect(persisted).toMatchObject({
      handle: 7,
      startAt: new Date('2026-04-30T10:00:00.000Z'),
    });
  });

  it('returns a distinct payload reference when after scripts overwrite in place', async () => {
    const item = {
      handle: 7,
      number: null as string | null,
      createdAt: new Date('2026-04-29T09:00:00.000Z'),
    };
    const scriptService = {
      runServer: jest.fn(() => {
        item.number = '2026#00007';

        return Promise.resolve(
          new ScriptResultServer([item], ScriptResultServerMethods.overwrite),
        );
      }),
    };
    const service = new GenericMutationService(
      {} as never,
      scriptService as never,
      new GenericFilterService(),
    );

    const overwritten = await service.applyAfterScript(
      ScriptMethods.afterInsert,
      item,
      { handle: 'ticket' } as never,
      { handle: 1 } as never,
    );

    expect(overwritten).toEqual({
      handle: 7,
      number: '2026#00007',
      createdAt: new Date('2026-04-29T09:00:00.000Z'),
    });
    expect(overwritten).not.toBe(item);
  });

  it('maps persistence errors to bad requests', async () => {
    const em = {
      nativeDelete: jest.fn(() =>
        Promise.reject(new TypeError('broken persistence')),
      ),
    };
    const service = new GenericMutationService(
      em as never,
      {} as never,
      new GenericFilterService(),
    );

    await expect(
      service.deleteAndFlush('ticket', () => undefined, { handle: 7 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps foreign key violations to actionable conflict errors', async () => {
    const em = {
      nativeDelete: jest.fn(() =>
        Promise.reject({
          name: 'ForeignKeyConstraintViolationException',
          message:
            'update or delete on table "person_item" violates foreign key constraint',
          code: '23503',
          detail:
            'Key (handle)=(113) is still referenced from table "favorite_item".',
          constraint: 'favorite_item_person_handle_foreign',
        }),
      ),
    };
    const service = new GenericMutationService(
      em as never,
      {} as never,
      new GenericFilterService(),
    );

    await expect(
      service.deleteAndFlush('person', () => undefined, { handle: 113 }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.deleteAndFlush('person', () => undefined, { handle: 113 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'global.deleteError',
        details: expect.objectContaining({
          referencingTable: 'favorite_item',
          referencedColumn: 'handle',
          referencedValue: '113',
          constraint: 'favorite_item_person_handle_foreign',
        }),
      }),
    });
  });
});
