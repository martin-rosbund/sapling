import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';
import { EventItem } from 'src/entity/EventItem';

@Processor('calendar')
@Injectable()
export class CalendarProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarProcessor.name);

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly azureCalendarService: AzureCalendarService,
  ) {
    super();
  }

  async process(
    job: Job<{
      provider: 'google' | 'azure';
      event: EventItem;
      accessToken: string;
    }>,
  ): Promise<any> {
    const { provider, event, accessToken } = job.data;
    this.logger.debug(`Processing calendar event for provider: ${provider}`);
    if (provider === 'google') {
      return await this.googleCalendarService.createEvent(event, accessToken);
    } else if (provider === 'azure') {
      return await this.azureCalendarService.createEvent(event, accessToken);
    } else {
      throw new Error('Unknown calendar provider');
    }
  }
}
