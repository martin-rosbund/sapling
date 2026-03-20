/**
 * @class CalendarModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for calendar-related functionality, including event delivery and integration with Google and Azure calendars.
 *
 * @property        {GoogleCalendarService}   GoogleCalendarService      Service for Google Calendar integration
 * @property        {AzureCalendarService}    AzureCalendarService      Service for Azure Calendar integration
 * @property        {CalendarProcessor}       CalendarProcessor         Processor for calendar event delivery (enabled if Redis is enabled)
 * @property        {EventDeliveryService}    EventDeliveryService      Service for event delivery management
 */
import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { CalendarProcessor } from './calendar.processor';
import { REDIS_ENABLED } from '../constants/project.constants';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';

// MockQueue analog zu webhook.module.ts
/**
 * MockQueue: Used when Redis is disabled to simulate queue operations.
 * @property {Function} add   Simulates adding a job to the queue, logs a warning instead.
 */
const MockQueue = {
  add: (name: string, data: any) => {
    global.log?.warn?.(
      `Redis is disabled. Job '${name}' was NOT added. Data: ${JSON.stringify(data)}`,
    );
    return null;
  },
};

/**
 * CalendarModule: Main module for calendar event delivery and integration.
 */
@Module({
  imports: [
    ...(REDIS_ENABLED ? [BullModule.registerQueue({ name: 'calendar' })] : []),
  ],
  providers: [
    GoogleCalendarService,
    AzureCalendarService,
    ...(REDIS_ENABLED ? [CalendarProcessor] : []),
    ...(!REDIS_ENABLED
      ? [
          {
            provide: getQueueToken('calendar'),
            useValue: MockQueue,
          },
        ]
      : []),
    require('./event.delivery.service').EventDeliveryService,
  ],
  exports: [
    GoogleCalendarService,
    AzureCalendarService,
    ...(REDIS_ENABLED ? [CalendarProcessor, BullModule] : []),
    require('./event.delivery.service').EventDeliveryService,
  ],
})
export class CalendarModule {}
