import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Processor('teams')
export class TeamsProcessor extends WorkerHost {
  private readonly logger = new Logger(TeamsProcessor.name);

  constructor(private readonly teamsService: TeamsService) {
    super();
  }

  async process(job: Job<{ deliveryId: number }>): Promise<void> {
    this.logger.debug(`Processing teams delivery #${job.data.deliveryId}`);
    await this.teamsService.dispatchDelivery(job.data.deliveryId);
  }
}
