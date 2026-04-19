import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { PersonController } from './PersonController';
import type { PersonItem } from '../entity/PersonItem';
import { ScriptResultServerMethods } from './core/script.result.server';

describe('PersonController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty login passwords and returns overwrite', async () => {
    const items = [
      { handle: 1, loginPassword: '' },
      { handle: 2, loginPassword: 'hashed-value' },
    ] as PersonItem[];
    const controller = new PersonController(
      { handle: 'person' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('loginPassword' in items[0]).toBe(false);
    expect(items[1].loginPassword).toBe('hashed-value');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});