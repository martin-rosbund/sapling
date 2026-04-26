import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/WebhookAuthenticationApiKeyItem', () => ({
  WebhookAuthenticationApiKeyItem: class {},
}));

import { WebhookAuthenticationApiKeyController } from './WebhookAuthenticationApiKeyController';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { WebhookAuthenticationApiKeyItem } from '../entity/WebhookAuthenticationApiKeyItem';

describe('WebhookAuthenticationApiKeyController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty api keys and returns overwrite', async () => {
    const items = [
      { handle: 1, apiKey: '' },
      { handle: 2, apiKey: 'secret-key' },
    ] as WebhookAuthenticationApiKeyItem[];
    const controller = new WebhookAuthenticationApiKeyController(
      { handle: 'webhookAuthenticationApiKey' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('apiKey' in items[0]).toBe(false);
    expect(items[1].apiKey).toBe('secret-key');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});
