import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/WebhookAuthenticationOAuth2Item', () => ({
  WebhookAuthenticationOAuth2Item: class {},
}));

import { WebhookAuthenticationOAuth2Controller } from './WebhookAuthenticationOAuth2Controller';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { WebhookAuthenticationOAuth2Item } from '../entity/WebhookAuthenticationOAuth2Item';

describe('WebhookAuthenticationOAuth2Controller', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty client secrets and returns overwrite', async () => {
    const items = [
      { handle: 1, clientSecret: '' },
      { handle: 2, clientSecret: 'oauth-secret' },
    ] as WebhookAuthenticationOAuth2Item[];
    const controller = new WebhookAuthenticationOAuth2Controller(
      { handle: 'webhookAuthenticationOAuth2' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('clientSecret' in items[0]).toBe(false);
    expect(items[1].clientSecret).toBe('oauth-secret');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});
