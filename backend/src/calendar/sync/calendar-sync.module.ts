import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  REDIS_ATTEMPTS,
  REDIS_BACKOFF_DELAY,
  REDIS_BACKOFF_STRATEGY,
  REDIS_ENABLED,
  REDIS_REMOVE_ON_COMPLETE,
  REDIS_REMOVE_ON_FAIL,
} from '../../constants/project.constants';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { CalendarModule } from '../calendar.module';
import { CalendarSyncProcessor } from './calendar-sync.processor';
import { CalendarSyncSubscriptionService } from './calendar-sync-subscription.service';

const MockQueue = {
  add: (name: string, data: unknown) => {
    global.log?.warn?.(
      `Redis is disabled. Job '${name}' was NOT added. Data: ${JSON.stringify(data)}`,
    );
    return null;
  },
};

@Module({
  imports: [
    CalendarModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue({
            name: 'calendar-sync',
            defaultJobOptions: {
              attempts: REDIS_ATTEMPTS,
              backoff: {
                type: REDIS_BACKOFF_STRATEGY,
                delay: REDIS_BACKOFF_DELAY,
              },
              removeOnComplete: REDIS_REMOVE_ON_COMPLETE,
              removeOnFail: REDIS_REMOVE_ON_FAIL,
            },
          }),
        ]
      : []),
  ],
  providers: [
    CalendarSyncSubscriptionService,
    ...(REDIS_ENABLED ? [CalendarSyncProcessor] : []),
    ...(REDIS_ENABLED
      ? []
      : [
          {
            provide: getQueueToken('calendar-sync'),
            useValue: MockQueue,
          },
        ]),
  ],
  exports: [CalendarSyncSubscriptionService],
})
export class CalendarSyncModule {}
