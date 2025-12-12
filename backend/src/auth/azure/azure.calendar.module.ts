import { Module } from '@nestjs/common';
import { AzureCalendarController } from '../../calendar/azure/azure.calendar.controller';
import { CalendarModule } from '../../calendar/calendar.module';

@Module({
  imports: [CalendarModule],
  controllers: [AzureCalendarController],
})
export class AzureCalendarModule {}
