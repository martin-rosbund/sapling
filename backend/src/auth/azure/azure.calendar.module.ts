import { Module } from '@nestjs/common';
import { AzureCalendarController } from '../../calendar/azure/azure.calendar.controller';
import { CalendarModule } from '../../calendar/calendar.module';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for Azure calendar integration.
 *
 * @property        imports             Imported modules (CalendarModule)
 * @property        controllers         Controllers used in this module (AzureCalendarController)
 */
@Module({
  imports: [CalendarModule],
  controllers: [AzureCalendarController],
})
export class AzureCalendarModule {}
