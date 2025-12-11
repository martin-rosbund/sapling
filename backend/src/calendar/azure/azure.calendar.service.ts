
import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { EventItem } from 'src/entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { REDIS_ENABLED } from '../../constants/project.constants';

@Injectable()
export class AzureCalendarService {

  constructor(private readonly eventDeliveryService: EventDeliveryService) {}

  async queueEvent(event: EventItem, accessToken: string) {
    if (!REDIS_ENABLED) {
      global.log?.warn?.('Redis is disabled. Azure calendar event was NOT queued.');
      return null;
    }
    // Use EventDeliveryService to create delivery and queue
    return await this.eventDeliveryService.queueEventDelivery(event, { accessToken, provider: 'azure' });
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
