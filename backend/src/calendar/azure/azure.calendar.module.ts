import { Module } from '@nestjs/common';
import { AzureCalendarController } from './azure.calendar.controller';
import { CalendarModule } from '../calendar.module';

@Module({
  imports: [CalendarModule],
  controllers: [AzureCalendarController],
})
export class AzureCalendarModule {}
