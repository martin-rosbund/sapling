import { Controller, Post, Body } from '@nestjs/common';
import { GoogleCalendarService } from './google.calendar.service';
import { EventItem } from 'src/entity/EventItem';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Post('event')
  async createEvent(@Body() event: EventItem) {
    const accessToken = '';
    return await this.googleCalendarService.createEvent(event, accessToken);
  }
}
