import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { EventItem } from 'src/entity/EventItem';

@Injectable()
export class GoogleCalendarService {
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
      resource: eventResource,
      auth: accessToken,
    });
  }
}
