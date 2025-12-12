
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { REDIS_ENABLED } from '../../constants/project.constants';

@Injectable()
export class GoogleCalendarService {

  constructor(private readonly eventDeliveryService: EventDeliveryService) {}

  async queueEvent(event: EventItem, accessToken: string) {
    if (!REDIS_ENABLED) {
      global.log?.warn?.('Redis is disabled. Google calendar event was NOT queued.');
      return null;
    }
    // Use EventDeliveryService to create delivery and queue
    return await this.eventDeliveryService.queueEventDelivery(event, { accessToken, provider: 'google' });
  }

  async createEvent(event: EventItem, accessToken: string): Promise<any> {
    const calendar = google.calendar({ version: 'v3' });
    const eventResource = {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startDate.toISOString() },
      end: { dateTime: event.endDate.toISOString() },
    };
    return await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventResource,
      auth: accessToken,
    });
  }
}
