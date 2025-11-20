import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { EventItem } from 'src/entity/EventItem';

@Injectable()
export class AzureCalendarService {
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
