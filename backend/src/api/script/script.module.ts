/**
 * @class ScriptModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module providing script-related services and controller for script API endpoints.
 *
 * @property        {ScriptService}     ScriptService     Service for script execution logic
 * @property        {ScriptController}  ScriptController  Controller for script endpoints
 */
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
