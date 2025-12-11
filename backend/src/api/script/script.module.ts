import { Module } from '@nestjs/common';
import { ScriptService } from './script.service';
import { WebhookModule } from '../webhook/webhook.module';

import { ScriptController } from './script.controller';

@Module({
  imports: [WebhookModule],
  controllers: [ScriptController],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
