// webhook.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule, getQueueToken } from '@nestjs/bullmq'; // NEU
import { WebhookSubscriptionItem } from 'src/entity/WebhookSubscriptionItem';
import { WebhookDeliveryItem } from 'src/entity/WebhookDeliveryItem';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessor } from './webhook.processor'; // NEU
import { ENABLE_REDIS } from 'src/constants/project.constants';

// Eine Fake-Queue Klasse für den Offline-Modus
const MockQueue = {
  add: async (name: string, data: any) => {
    global.log.warn(
      `[MockQueue] Redis is disabled. Job '${name}' was NOT added.`,
      'WebhookModule',
    );
    return null;
  },
};

@Module({
  imports: [
    MikroOrmModule.forFeature([WebhookSubscriptionItem, WebhookDeliveryItem]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ...(ENABLE_REDIS
      ? [
          BullModule.registerQueue({
            name: 'webhooks',
            defaultJobOptions: {
              attempts: 5,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: true,
              removeOnFail: 100,
            },
          }),
        ]
      : []),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    ...(ENABLE_REDIS ? [WebhookProcessor] : []),
    ...(ENABLE_REDIS
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
