
import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { CalendarProcessor } from './calendar.processor';
import { REDIS_ENABLED } from '../constants/project.constants';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';

// MockQueue analog zu webhook.module.ts
const MockQueue = {
  add: (name: string, data: any) => {
    global.log?.warn?.(
      `Redis is disabled. Job '${name}' was NOT added. Data: ${JSON.stringify(data)}`,
    );
    return null;
  },
};

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
  ],
  exports: [
    GoogleCalendarService,
    AzureCalendarService,
    ...(REDIS_ENABLED ? [CalendarProcessor, BullModule] : []),
  ],
})
export class CalendarModule {}
