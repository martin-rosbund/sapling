import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from '../../script/core/script.result.server';
import { ScriptMethods } from '../script/script.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';
import { GenericMutationService } from './generic-mutation.service';

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
});
