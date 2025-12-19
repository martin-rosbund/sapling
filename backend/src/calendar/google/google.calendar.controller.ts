import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { EventItem } from '../../entity/EventItem';
import { GoogleCalendarService } from './google.calendar.service';
import { PersonItem } from 'src/entity/PersonItem';

@Controller('api/google')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Post('event')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerEvent(
    @Req() req: Request & { user: PersonItem },
    @Body() event: EventItem,
  ) {
    if (!req.user.session) {
      throw new Error('global.authenticationFailed');
    }
    const job = await this.googleCalendarService.queueEvent(
      event,
      req.user.session,
    );
    return {
      message: 'Google calendar event queued',
      jobId: job?.handle,
    };
  }
}
