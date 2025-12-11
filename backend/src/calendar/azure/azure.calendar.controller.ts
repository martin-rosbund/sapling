import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EventItem } from 'src/entity/EventItem';
import { AzureCalendarService } from './azure.calendar.service';

@Controller('azure-calendar')
export class AzureCalendarController {
  constructor(private readonly azureCalendarService: AzureCalendarService) {}

  @Post('event')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerEvent(@Body() event: EventItem) {
    const accessToken = '';
    const job = await this.azureCalendarService.queueEvent(event, accessToken);
    return {
      message: 'Azure calendar event queued',
      jobId: job?.handle,
    };
  }
}
