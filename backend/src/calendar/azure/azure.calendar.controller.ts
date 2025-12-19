import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { EventItem } from '../../entity/EventItem';
import { AzureCalendarService } from './azure.calendar.service';
import { PersonItem } from 'src/entity/PersonItem';

@Controller('api/azure')
export class AzureCalendarController {
  constructor(private readonly azureCalendarService: AzureCalendarService) {}

  @Post('event')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerEvent(
    @Req() req: Request & { user: PersonItem },
    @Body() event: EventItem,
  ) {
    if (!req.user.session) {
      throw new Error('global.authenticationFailed');
    }
    const job = await this.azureCalendarService.queueEvent(
      event,
      req.user.session,
    );
    return {
      message: 'Azure calendar event queued',
      jobId: job?.handle,
    };
  }
}
