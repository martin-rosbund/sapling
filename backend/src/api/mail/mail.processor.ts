import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

@Processor('emails')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<{ deliveryId: number }>): Promise<void> {
    this.logger.debug(`Processing email delivery #${job.data.deliveryId}`);
    await this.mailService.dispatchDelivery(job.data.deliveryId);
  }
}
