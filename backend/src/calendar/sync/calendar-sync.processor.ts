import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { CalendarSyncSubscriptionService } from './calendar-sync-subscription.service';

@Processor('calendar-sync')
@Injectable()
export class CalendarSyncProcessor extends WorkerHost {
  constructor(private readonly service: CalendarSyncSubscriptionService) {
    super();
  }

  async process(job: Job<{ subscriptionHandle?: number }>): Promise<void> {
    switch (job.name) {
      case 'schedule-calendar-imports':
        await this.service.enqueueDueSubscriptions();
        return;
      case 'import-calendar-for-subscription':
        if (typeof job.data.subscriptionHandle !== 'number') {
          throw new Error('calendarSyncSubscription.subscriptionHandleRequired');
        }
        await this.service.executeSubscriptionImport(
          job.data.subscriptionHandle,
        );
        return;
      default:
        throw new Error(`calendarSyncSubscription.unknownJob:${job.name}`);
    }
  }
}
