import { Controller, Post, Body } from '@nestjs/common';
import { AzureCalendarService } from './azure.calendar.service';
import { EventItem } from 'src/entity/EventItem';

@Controller('azure-calendar')
export class AzureCalendarController {
  constructor(private readonly azureCalendarService: AzureCalendarService) {}

  @Post('event')
  async createEvent(@Body() event: EventItem) {
    const accessToken = '';
    return await this.azureCalendarService.createEvent(event, accessToken);
  }
}
