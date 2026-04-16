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
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';
import { EmailDeliveryStatusItem } from '../../entity/EmailDeliveryStatusItem';
import { EmailTemplateItem } from '../../entity/EmailTemplateItem';
import { DocumentItem } from '../../entity/DocumentItem';
import { EntityItem } from '../../entity/EntityItem';
import { MailController } from './mail.controller';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';
import { TemplateModule } from '../template/template.module';

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
    MikroOrmModule.forFeature([
      EmailDeliveryItem,
      EmailDeliveryStatusItem,
      EmailTemplateItem,
      DocumentItem,
      EntityItem,
    ]),
    TemplateModule,
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue({
            name: 'emails',
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
  controllers: [MailController],
  providers: [
    MailService,
    ...(REDIS_ENABLED ? [MailProcessor] : []),
    ...(REDIS_ENABLED
      ? []
      : [
          {
            provide: getQueueToken('emails'),
            useValue: MockQueue,
          },
        ]),
  ],
  exports: [MailService],
})
export class MailModule {}
