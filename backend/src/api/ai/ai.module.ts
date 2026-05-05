import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../../auth/auth.module';
import { DocumentModule } from '../document/document.module';
import { GenericModule } from '../generic/generic.module';
import { CurrentModule } from '../current/current.module';
import { TemplateModule } from '../template/template.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiChatTranscriptionItem } from '../../entity/AiChatTranscriptionItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import { McpServerConfigItem } from '../../entity/McpServerConfigItem';
import { AiVectorDocumentItem } from '../../entity/AiVectorDocumentItem';
import { McpService } from './mcp.service';
import { SaplingMcpService } from './sapling-mcp.service';
import { SaplingMcpPermissionService } from './sapling-mcp-permission.service';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for AI operations, including controller and service registration.
 *
 * @property        {AiController} AiController  Controller for AI endpoints
 * @property        {AiService} AiService        Service for AI logic
 */
@Module({
  imports: [
    AuthModule,
    DocumentModule,
    GenericModule,
    TemplateModule,
    CurrentModule,
    MikroOrmModule.forFeature([
      AiChatSessionItem,
      AiChatMessageItem,
      AiChatTranscriptionItem,
      AiProviderTypeItem,
      AiProviderModelItem,
      AiVectorDocumentItem,
      McpServerConfigItem,
    ]),
  ],
  providers: [
    AiService,
    McpService,
    SaplingMcpService,
    SaplingMcpPermissionService,
  ],
  controllers: [AiController],
  exports: [AiService, McpService, SaplingMcpService],
})
export class AiModule {}
