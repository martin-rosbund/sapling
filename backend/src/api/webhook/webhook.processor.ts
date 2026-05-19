import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { WebhookDeliveryExecutor } from './webhook-delivery.executor';

@Processor('webhooks')
@Injectable()
export class WebhookProcessor extends WorkerHost {
  constructor(private readonly executor: WebhookDeliveryExecutor) {
    super();
  }

  async process(job: Job<{ deliveryId: number }>): Promise<void> {
    await this.executor.execute(job.data.deliveryId, job.attemptsMade + 1);
  }
}
