import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TemplateModule } from '../template/template.module';
import { InboxNotificationItem } from '../../entity/InboxNotificationItem';
import { InboxSubscriptionItem } from '../../entity/InboxSubscriptionItem';
import { InboxTemplateItem } from '../../entity/InboxTemplateItem';
import { OpenTaskEventsModule } from '../current/open-task-events.module';
import { InboxService } from './inbox.service';

@Module({
  imports: [
    TemplateModule,
    OpenTaskEventsModule,
    MikroOrmModule.forFeature([
      InboxNotificationItem,
      InboxSubscriptionItem,
      InboxTemplateItem,
    ]),
  ],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
