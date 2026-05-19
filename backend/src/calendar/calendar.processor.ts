/**
 * @class CalendarProcessor
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         BullMQ worker wrapper for calendar deliveries.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { CalendarDeliveryExecutor } from './calendar-delivery.executor';

@Processor('calendar')
@Injectable()
export class CalendarProcessor extends WorkerHost {
  constructor(private readonly executor: CalendarDeliveryExecutor) {
    super();
  }

  async process(job: Job<{ deliveryId: number }>): Promise<void> {
    await this.executor.execute(job.data.deliveryId, job.attemptsMade + 1);
  }
}
