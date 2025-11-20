import { Module } from '@nestjs/common';
import { AzureCalendarService } from './azure.calendar.service';
import { AzureCalendarController } from './azure.calendar.controller';

@Module({
  providers: [AzureCalendarService],
  controllers: [AzureCalendarController],
  exports: [AzureCalendarService],
})
export class AzureCalendarModule {}
