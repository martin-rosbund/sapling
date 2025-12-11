import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GoogleCalendarService } from './google.calendar.service';
import { EventItem } from 'src/entity/EventItem';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Post('event')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerEvent(@Body() event: EventItem) {
    const accessToken = '';
    const job = await this.googleCalendarService.queueEvent(event, accessToken);
    return {
      message: 'Google calendar event queued',
      jobId: job.id,
    };
  }
}
