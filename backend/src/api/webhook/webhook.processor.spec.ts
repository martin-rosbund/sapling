import { describe, expect, it, jest } from '@jest/globals';
import { WebhookProcessor } from './webhook.processor';

describe('WebhookProcessor', () => {
  it('forwards the delivery to the shared executor with a one-based attempt count', async () => {
    const executor = {
      execute: jest.fn(),
    };
    const processor = new WebhookProcessor(executor as never);

    await processor.process({
      data: { deliveryId: 42 },
      attemptsMade: 0,
    } as never);

    expect(executor.execute).toHaveBeenCalledWith(42, 1);
  });
});
