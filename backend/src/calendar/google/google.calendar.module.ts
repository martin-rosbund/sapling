/**
 * @class GoogleCalendarModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for Google Calendar integration, including controller and queue setup.
 *
 * @property        {GoogleCalendarController} GoogleCalendarController Controller for Google Calendar API
 * @property        {MockQueue} MockQueue      Mock queue for offline mode (when Redis is disabled)
 */
import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google.calendar.controller';
import { CalendarModule } from '../calendar.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { getQueueToken } from '@nestjs/bullmq';
import { REDIS_ENABLED } from '../../constants/project.constants';

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
 * GoogleCalendarModule: Main module for Google Calendar integration.
 */
@Module({
  imports: [
    CalendarModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
  ],
  controllers: [GoogleCalendarController],
  providers: [
    ...(REDIS_ENABLED
      ? []
      : [
          {
            provide: getQueueToken('calendar'),
            useValue: MockQueue,
          },
        ]),
  ],
})
export class GoogleCalendarModule {}
