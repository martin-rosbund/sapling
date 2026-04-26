import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/WebhookSubscriptionItem', () => ({
  WebhookSubscriptionItem: class {},
}));

import { WebhookSubscriptionController } from './WebhookSubscriptionController';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { WebhookSubscriptionItem } from '../entity/WebhookSubscriptionItem';

describe('WebhookSubscriptionController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty signing secrets and returns overwrite', async () => {
    const items = [
      { handle: 1, signingSecret: '' },
      { handle: 2, signingSecret: 'signing-secret' },
    ] as WebhookSubscriptionItem[];
    const controller = new WebhookSubscriptionController(
      { handle: 'webhookSubscription' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('signingSecret' in items[0]).toBe(false);
    expect(items[1].signingSecret).toBe('signing-secret');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});
