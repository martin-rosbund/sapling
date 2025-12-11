
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Client } from '@microsoft/microsoft-graph-client';
import { EventItem } from 'src/entity/EventItem';
import { REDIS_ENABLED } from '../../constants/project.constants';

@Injectable()
export class AzureCalendarService {

  constructor(@InjectQueue('calendar') private readonly calendarQueue: Queue) {}

  async queueEvent(event: EventItem, accessToken: string) {
    if (!REDIS_ENABLED) {
      global.log?.warn?.('Redis is disabled. Azure calendar event was NOT queued.');
      return null;
    }
    return await this.calendarQueue.add('create-calendar-event', {
      provider: 'azure',
      event,
      accessToken,
    });
  }

  async createEvent(event: EventItem, accessToken: string): Promise<any> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
    const eventResource = {
      subject: event.title,
      body: { contentType: 'HTML', content: event.description },
      start: { dateTime: event.startDate.toISOString(), timeZone: 'UTC' },
      end: { dateTime: event.endDate.toISOString(), timeZone: 'UTC' },
    };
    return await client.api('/me/events').post(eventResource);
  }
}
