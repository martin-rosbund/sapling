import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../../auth/auth.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { McpServerConfigItem } from '../../entity/McpServerConfigItem';
import { McpService } from './mcp.service';

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
    MikroOrmModule.forFeature([
      AiChatSessionItem,
      AiChatMessageItem,
      McpServerConfigItem,
    ]),
  ],
  providers: [AiService, McpService],
  controllers: [AiController],
  exports: [AiService, McpService],
})
export class AiModule {}
