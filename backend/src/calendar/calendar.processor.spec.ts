import { describe, expect, it, jest } from '@jest/globals';
import { CalendarProcessor } from './calendar.processor';

describe('CalendarProcessor', () => {
  it('forwards the delivery to the shared executor with a one-based attempt count', async () => {
    const executor = {
      execute: jest.fn(() => undefined),
    };
    const processor = new CalendarProcessor(executor as never);

    await processor.process({
      data: { deliveryId: 21 },
      attemptsMade: 0,
    } as never);

    expect(executor.execute).toHaveBeenCalledWith(21, 1);
  });
});
