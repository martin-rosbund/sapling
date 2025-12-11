import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google.calendar.controller';
import { CalendarModule } from '../calendar.module';

@Module({
  imports: [CalendarModule],
  controllers: [GoogleCalendarController],
})
export class GoogleCalendarModule {}
