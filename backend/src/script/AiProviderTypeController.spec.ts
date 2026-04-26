import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/AiProviderTypeItem', () => ({
  AiProviderTypeItem: class {},
}));
jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { AiProviderTypeController } from './AiProviderTypeController';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { AiProviderTypeItem } from '../entity/AiProviderTypeItem';

describe('AiProviderTypeController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes null credentials and returns overwrite', async () => {
    const items = [
      { handle: 'openai', credentials: null },
      { handle: 'azure', credentials: { apiKey: 'secret' } },
    ] as AiProviderTypeItem[];
    const controller = new AiProviderTypeController(
      { handle: 'aiProviderType' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('credentials' in items[0]).toBe(false);
    expect(items[1].credentials).toEqual({ apiKey: 'secret' });
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});
