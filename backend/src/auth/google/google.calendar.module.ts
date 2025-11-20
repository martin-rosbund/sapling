import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google.calendar.service';
import { GoogleCalendarController } from './google.calendar.controller';

@Module({
  providers: [GoogleCalendarService],
  controllers: [GoogleCalendarController],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
