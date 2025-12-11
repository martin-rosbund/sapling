import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { google } from 'googleapis';
import { EventItem } from 'src/entity/EventItem';

@Injectable()
export class GoogleCalendarService {
  constructor(@InjectQueue('calendar') private readonly calendarQueue: Queue) {}

  async queueEvent(event: EventItem, accessToken: string) {
    return await this.calendarQueue.add('create-calendar-event', {
      provider: 'google',
      event,
      accessToken,
    });
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
