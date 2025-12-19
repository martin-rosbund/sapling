import { Module } from '@nestjs/common';
import { ScriptService } from './script.service';
import { WebhookModule } from '../webhook/webhook.module';
import { CalendarModule } from '../../calendar/calendar.module';

import { ScriptController } from './script.controller';

@Module({
  imports: [WebhookModule, CalendarModule],
  controllers: [ScriptController],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
