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
import { AuthModule } from '../../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { TeamsModule } from '../teams/teams.module';
import { InboxModule } from '../inbox/inbox.module';
import { CurrentModule } from '../current/current.module';
import { TemplateModule } from '../template/template.module';
import { AiProviderRegistryService } from '../ai/ai-provider-registry.service';
import { GenericPermissionService } from '../generic/generic-permission.service';
import { AiEntityGenerationService } from './ai-entity-generation.service';

import { ScriptController } from './script.controller';

@Module({
  imports: [
    AuthModule,
    WebhookModule,
    CalendarModule,
    MailModule,
    TeamsModule,
    InboxModule,
    CurrentModule,
    TemplateModule,
  ],
  controllers: [ScriptController],
  providers: [
    ScriptService,
    AiProviderRegistryService,
    GenericPermissionService,
    AiEntityGenerationService,
  ],
  exports: [ScriptService],
})
export class ScriptModule {}
