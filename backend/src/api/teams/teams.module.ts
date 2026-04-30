import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import {
  REDIS_ATTEMPTS,
  REDIS_BACKOFF_DELAY,
  REDIS_BACKOFF_STRATEGY,
  REDIS_ENABLED,
  REDIS_REMOVE_ON_COMPLETE,
  REDIS_REMOVE_ON_FAIL,
} from '../../constants/project.constants';
import { AuthModule } from '../../auth/auth.module';
import { TemplateModule } from '../template/template.module';
import { TeamsService } from './teams.service';
import { TeamsProcessor } from './teams.processor';
import { TeamsDeliveryItem } from '../../entity/TeamsDeliveryItem';
import { TeamsDeliveryStatusItem } from '../../entity/TeamsDeliveryStatusItem';
import { TeamsSubscriptionItem } from '../../entity/TeamsSubscriptionItem';
import { TeamsTemplateItem } from '../../entity/TeamsTemplateItem';

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
    AuthModule,
    TemplateModule,
    MikroOrmModule.forFeature([
      TeamsDeliveryItem,
      TeamsDeliveryStatusItem,
      TeamsSubscriptionItem,
      TeamsTemplateItem,
    ]),
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue({
            name: 'teams',
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
    TeamsService,
    ...(REDIS_ENABLED ? [TeamsProcessor] : []),
    ...(REDIS_ENABLED
      ? []
      : [
          {
            provide: getQueueToken('teams'),
            useValue: MockQueue,
          },
        ]),
  ],
  exports: [TeamsService],
})
export class TeamsModule {}
