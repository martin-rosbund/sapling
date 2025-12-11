import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';
import { CalendarProcessor } from './calendar.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'calendar' })],
  providers: [GoogleCalendarService, AzureCalendarService, CalendarProcessor],
  exports: [
    GoogleCalendarService,
    AzureCalendarService,
    CalendarProcessor,
    BullModule,
  ],
})
export class CalendarModule {}
