import { describe, expect, it, jest } from '@jest/globals';
import { CalendarSyncProcessor } from './calendar-sync.processor';

describe('CalendarSyncProcessor', () => {
  it('enqueues due subscriptions for scheduler jobs', async () => {
    const service = {
      enqueueDueSubscriptions: jest.fn(),
      executeSubscriptionImport: jest.fn(),
    };
    const processor = new CalendarSyncProcessor(service as never);

    await processor.process({
      name: 'schedule-calendar-imports',
      data: {},
    } as never);

    expect(service.enqueueDueSubscriptions).toHaveBeenCalledTimes(1);
    expect(service.executeSubscriptionImport).not.toHaveBeenCalled();
  });

  it('executes import jobs for the requested subscription', async () => {
    const service = {
      enqueueDueSubscriptions: jest.fn(),
      executeSubscriptionImport: jest.fn(),
    };
    const processor = new CalendarSyncProcessor(service as never);

    await processor.process({
      name: 'import-calendar-for-subscription',
      data: { subscriptionHandle: 42 },
    } as never);

    expect(service.executeSubscriptionImport).toHaveBeenCalledWith(42);
    expect(service.enqueueDueSubscriptions).not.toHaveBeenCalled();
  });
});
