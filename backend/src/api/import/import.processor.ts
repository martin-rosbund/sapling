import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImportService } from './import.service';

export type ImportJobData = {
  batchHandle: number;
  userHandle: number;
};

@Processor('imports')
@Injectable()
export class ImportProcessor extends WorkerHost {
  constructor(private readonly importService: ImportService) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    switch (job.name) {
      case 'validate-import-batch':
        await this.importService.processQueuedValidation(
          job.data.batchHandle,
          job.data.userHandle,
        );
        return;
      case 'execute-import-batch':
        await this.importService.processQueuedExecution(
          job.data.batchHandle,
          job.data.userHandle,
        );
        return;
      default:
        throw new Error(`import.unknownJob:${job.name}`);
    }
  }
}
