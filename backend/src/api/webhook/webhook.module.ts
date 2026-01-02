// webhook.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryItem } from '../../entity/WebhookDeliveryItem';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessor } from './webhook.processor';
import * as https from 'https';
import {
  REDIS_ATTEMPTS,
  REDIS_BACKOFF_DELAY,
  REDIS_BACKOFF_STRATEGY,
  REDIS_ENABLED,
  REDIS_REMOVE_ON_COMPLETE,
  REDIS_REMOVE_ON_FAIL,
  WEBHOOK_MAX_REDIRECTS,
  WEBHOOK_TIMEOUT,
} from '../../constants/project.constants';

// Eine Fake-Queue Klasse für den Offline-Modus
const MockQueue = {
  add: (name: string, data: any) => {
    global.log.warn(
      `Redis is disabled. Job '${name}' was NOT added. Data: ${JSON.stringify(data)}`,
    );
    return null;
  },
};

@Module({
  imports: [
    MikroOrmModule.forFeature([WebhookSubscriptionItem, WebhookDeliveryItem]),
    HttpModule.register({
      timeout: WEBHOOK_TIMEOUT,
      maxRedirects: WEBHOOK_MAX_REDIRECTS,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    }),
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue({
            name: 'webhooks',
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
  controllers: [WebhookController],
  providers: [
    WebhookService,
    ...(REDIS_ENABLED ? [WebhookProcessor] : []),
    ...(REDIS_ENABLED
      ? []
      : [
          {
            provide: getQueueToken('webhooks'),
            useValue: MockQueue,
          },
        ]),
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
