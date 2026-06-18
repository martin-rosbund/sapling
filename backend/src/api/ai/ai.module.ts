import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../../auth/auth.module';
import { DocumentModule } from '../document/document.module';
import { GenericModule } from '../generic/generic.module';
import { CurrentModule } from '../current/current.module';
import { TemplateModule } from '../template/template.module';
import { AiService } from './ai.service';
import { AiChatRuntimeService } from './ai-chat-runtime.service';
import { AiAgentRunLifecycleService } from './ai-agent-run-lifecycle.service';
import { AiAgentPolicyService } from './ai-agent-policy.service';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { AiVectorService } from './ai-vector.service';
import { AiController } from './ai.controller';
import { AiAgentItem } from '../../entity/AiAgentItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiChatTranscriptionItem } from '../../entity/AiChatTranscriptionItem';
import { AiChatToolActionItem } from '../../entity/AiChatToolActionItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import { McpServerConfigItem } from '../../entity/McpServerConfigItem';
import { AiVectorDocumentItem } from '../../entity/AiVectorDocumentItem';
import { McpService } from './mcp.service';
import { SaplingMcpService } from './sapling-mcp.service';
import { SaplingMcpCriteriaService } from './sapling-mcp-criteria.service';
import { SaplingMcpPermissionService } from './sapling-mcp-permission.service';
import { SaplingMcpResultFormatterService } from './sapling-mcp-result-formatter.service';
import { AiAgentEvaluationItem } from '../../entity/AiAgentEvaluationItem';
import { AiAgentMemoryItem } from '../../entity/AiAgentMemoryItem';
import { AiAgentPlaybookItem } from '../../entity/AiAgentPlaybookItem';
import { AiAgentRunItem } from '../../entity/AiAgentRunItem';
import { AiAgentVersionItem } from '../../entity/AiAgentVersionItem';
import { AiChatAttachmentItem } from '../../entity/AiChatAttachmentItem';
import { ImportModule } from '../import/import.module';

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
    forwardRef(() => ImportModule),
    MikroOrmModule.forFeature([
      AiChatSessionItem,
      AiChatMessageItem,
      AiChatAttachmentItem,
      AiChatTranscriptionItem,
      AiChatToolActionItem,
      AiAgentItem,
      AiAgentVersionItem,
      AiAgentRunItem,
      AiAgentEvaluationItem,
      AiAgentPlaybookItem,
      AiAgentMemoryItem,
      AiProviderTypeItem,
      AiProviderModelItem,
      AiVectorDocumentItem,
      McpServerConfigItem,
    ]),
  ],
  providers: [
    AiService,
    AiChatRuntimeService,
    AiAgentRunLifecycleService,
    AiAgentPolicyService,
    AiProviderRegistryService,
    AiVectorService,
    McpService,
    SaplingMcpService,
    SaplingMcpCriteriaService,
    SaplingMcpPermissionService,
    SaplingMcpResultFormatterService,
  ],
  controllers: [AiController],
  exports: [
    AiService,
    AiProviderRegistryService,
    McpService,
    SaplingMcpService,
  ],
})
export class AiModule {}
