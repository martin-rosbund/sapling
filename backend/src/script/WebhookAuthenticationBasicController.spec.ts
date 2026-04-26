import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/WebhookAuthenticationBasicItem', () => ({
  WebhookAuthenticationBasicItem: class {},
}));

import { WebhookAuthenticationBasicController } from './WebhookAuthenticationBasicController';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { WebhookAuthenticationBasicItem } from '../entity/WebhookAuthenticationBasicItem';

describe('WebhookAuthenticationBasicController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty passwords and returns overwrite', async () => {
    const items = [
      { handle: 1, password: '' },
      { handle: 2, password: 'secret-password' },
    ] as WebhookAuthenticationBasicItem[];
    const controller = new WebhookAuthenticationBasicController(
      { handle: 'webhookAuthenticationBasic' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('password' in items[0]).toBe(false);
    expect(items[1].password).toBe('secret-password');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});
