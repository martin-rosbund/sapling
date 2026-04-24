import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AiService } from './ai.service';
import { SaplingMcpService } from './sapling-mcp.service';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import { AdminPermissionGuard } from '../../auth/guard/admin-permission.guard';
import { AdminPermission } from '../../auth/admin-permission';
import { PersonItem } from '../../entity/PersonItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import {
  AiChatMessageListResponseDto,
  CreateAiChatMessageDto,
  CreateAiChatSessionDto,
  ListAiChatMessagesQueryDto,
  UpdateAiChatSessionDto,
} from './dto/chat.dto';
import {
  VectorizeEntityDto,
  VectorizeEntityResponseDto,
} from './dto/vectorization.dto';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for AI operations, including endpoints for asking questions and creating entities.
 *
 * @property        {AiService} aiService  Service handling AI logic
 *
 * @method          ask          Returns an answer to a question using the AI service
 * @method          createEntity Creates a new entity using the AI service
 */
@ApiTags('AI')
@ApiBearerAuth()
@Controller('api/ai')
@UseGuards(SessionOrBearerAuthGuard)
export class AiController {
  /**
   * Service handling AI logic.
   * @type {AiService}
   */
  constructor(
    private readonly aiService: AiService,
    private readonly saplingMcpService: SaplingMcpService,
  ) {}

  @Post('mcp')
  @ApiOperation({ summary: 'Handle Sapling MCP Streamable HTTP POST requests' })
  async handleMcpPost(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
  ): Promise<void> {
    await this.saplingMcpService.handlePost(req, res);
  }

  @Get('mcp')
  @ApiOperation({ summary: 'Handle Sapling MCP Streamable HTTP GET requests' })
  async handleMcpGet(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
  ): Promise<void> {
    await this.saplingMcpService.handleGet(req, res);
  }

  @Delete('mcp')
  @ApiOperation({
    summary: 'Handle Sapling MCP Streamable HTTP DELETE requests',
  })
  async handleMcpDelete(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
  ): Promise<void> {
    await this.saplingMcpService.handleDelete(req, res);
  }

  @Get('chat/providers')
  @ApiOperation({ summary: 'List active AI providers' })
  @ApiResponse({ status: 200, type: AiProviderTypeItem, isArray: true })
  async listProviders(): Promise<AiProviderTypeItem[]> {
    return this.aiService.listActiveProviders('chat');
  }

  @Get('chat/models')
  @ApiOperation({ summary: 'List active AI models' })
  @ApiQuery({ name: 'providerHandle', required: false, type: String })
  @ApiResponse({ status: 200, type: AiProviderModelItem, isArray: true })
  async listModels(
    @Query('providerHandle') providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    return this.aiService.listActiveModels(providerHandle, 'chat');
  }

  @Get('vectorization/providers')
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({
    summary: 'List active AI providers for embedding generation',
  })
  @ApiResponse({ status: 200, type: AiProviderTypeItem, isArray: true })
  async listVectorizationProviders(): Promise<AiProviderTypeItem[]> {
    return this.aiService.listActiveProviders('embedding');
  }

  @Get('vectorization/models')
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'List active AI embedding models' })
  @ApiQuery({ name: 'providerHandle', required: false, type: String })
  @ApiResponse({ status: 200, type: AiProviderModelItem, isArray: true })
  async listVectorizationModels(
    @Query('providerHandle') providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    return this.aiService.listActiveModels(providerHandle, 'embedding');
  }

  @Post('vectorization')
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({
    summary: 'Vectorize one supported entity for semantic search',
  })
  @ApiBody({ type: VectorizeEntityDto })
  @ApiResponse({ status: 201, type: VectorizeEntityResponseDto })
  async vectorizeEntity(
    @Body() body: VectorizeEntityDto,
  ): Promise<VectorizeEntityResponseDto> {
    return this.aiService.vectorizeEntity(body);
  }

  @Get('chat/sessions')
  @ApiOperation({ summary: 'List chat sessions for the current user' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: AiChatSessionItem, isArray: true })
  async listSessions(
    @Req() req: Request & { user: PersonItem },
    @Query('includeArchived') includeArchived?: string,
  ): Promise<AiChatSessionItem[]> {
    return this.aiService.listChatSessions(
      req.user,
      includeArchived === 'true' || includeArchived === '1',
    );
  }

  @Post('chat/sessions')
  @ApiOperation({ summary: 'Create a new chat session for the current user' })
  @ApiBody({ type: CreateAiChatSessionDto })
  @ApiResponse({ status: 201, type: AiChatSessionItem })
  async createSession(
    @Req() req: Request & { user: PersonItem },
    @Body() body: CreateAiChatSessionDto,
  ): Promise<AiChatSessionItem> {
    return this.aiService.createChatSession(body, req.user);
  }

  @Patch('chat/sessions/:handle')
  @ApiOperation({ summary: 'Update a chat session for the current user' })
  @ApiBody({ type: UpdateAiChatSessionDto })
  @ApiResponse({ status: 200, type: AiChatSessionItem })
  async updateSession(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Body() body: UpdateAiChatSessionDto,
  ): Promise<AiChatSessionItem> {
    return this.aiService.updateChatSession(handle, body, req.user);
  }

  @Get('chat/sessions/:handle/messages')
  @ApiOperation({
    summary: 'List chat messages of a session for the current user',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'beforeSequence', required: false, type: Number })
  @ApiResponse({ status: 200, type: AiChatMessageListResponseDto })
  async listMessages(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Query() query: ListAiChatMessagesQueryDto,
  ): Promise<AiChatMessageListResponseDto> {
    return this.aiService.listChatMessages(handle, req.user, query);
  }

  @Post('chat/messages')
  @ApiOperation({
    summary: 'Persist a new user chat message and create a session if needed',
  })
  @ApiBody({ type: CreateAiChatMessageDto })
  @ApiResponse({
    status: 201,
    schema: {
      properties: {
        session: { $ref: '#/components/schemas/AiChatSessionItem' },
        message: { $ref: '#/components/schemas/AiChatMessageItem' },
      },
    },
  })
  async createMessage(
    @Req() req: Request & { user: PersonItem },
    @Body() body: CreateAiChatMessageDto,
  ): Promise<{ session: AiChatSessionItem; message: AiChatMessageItem }> {
    return this.aiService.createChatMessage(body, req.user);
  }

  @Post('chat/stream')
  @ApiOperation({
    summary: 'Persist a user message and stream the assistant response',
  })
  @ApiBody({ type: CreateAiChatMessageDto })
  async streamChat(
    @Req() req: Request & { user: PersonItem },
    @Body() body: CreateAiChatMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      await this.aiService.streamChatMessage(body, req.user, (event) => {
        res.write(`${JSON.stringify(event)}\n`);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ai.streamFailed';
      res.write(`${JSON.stringify({ type: 'error', messageText: message })}\n`);
    } finally {
      res.end();
    }
  }
}
