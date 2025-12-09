import { Module } from '@nestjs/common';
import { ScriptService } from './script.service';
import { WebhookModule } from '../../api/webhook/webhook.module';

@Module({
  imports: [WebhookModule],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
