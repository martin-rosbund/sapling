import { Controller, Post, Body, Req } from '@nestjs/common';
import { AzureCalendarService } from './azure.calendar.service';
import { EventItem } from 'src/entity/EventItem';

@Controller('azure-calendar')
export class AzureCalendarController {
  constructor(private readonly azureCalendarService: AzureCalendarService) {}

  @Post('event')
  async createEvent(@Body() event: EventItem, @Req() req: any) {
    const accessToken = '';
    return await this.azureCalendarService.createEvent(event, accessToken);
  }
}
