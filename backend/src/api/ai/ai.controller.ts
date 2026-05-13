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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
  CreateAiChatMessageSpeechDto,
  CreateAiChatMessageDto,
  CreateAiChatSessionDto,
  ListAiChatMessagesQueryDto,
  UpdateAiChatSessionDto,
} from './dto/chat.dto';
import {
  VectorizeEntityDto,
  VectorizeEntityResponseDto,
} from './dto/vectorization.dto';
import {
  AiChatTranscriptionResponseDto,
  CreateAiChatTranscriptionDto,
} from './dto/transcription.dto';

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
  @ApiOperation({
    summary: 'Forward an MCP POST request',
    description:
      'Accepts a streamable HTTP POST request for the authenticated Sapling Model Context Protocol session and forwards it to the MCP runtime.',
  })
  async handleMcpPost(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
  ): Promise<void> {
    await this.saplingMcpService.handlePost(req, res);
  }

  @Get('mcp')
  @ApiOperation({
    summary: 'Forward an MCP GET request',
    description:
      'Opens, resumes, or reads a streamable HTTP interaction for the authenticated Sapling Model Context Protocol session.',
  })
  async handleMcpGet(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
  ): Promise<void> {
    await this.saplingMcpService.handleGet(req, res);
  }

  @Delete('mcp')
  @ApiOperation({
    summary: 'Forward an MCP DELETE request',
    description:
      'Terminates a streamable HTTP interaction for the authenticated Sapling Model Context Protocol session.',
  })
  async handleMcpDelete(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
  ): Promise<void> {
    await this.saplingMcpService.handleDelete(req, res);
  }

  @Get('chat/providers')
  @ApiOperation({
    summary: 'List available chat providers',
    description:
      'Returns the active AI providers that can currently be used for chat completions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active chat providers available to the current user.',
    type: AiProviderTypeItem,
    isArray: true,
  })
  async listProviders(): Promise<AiProviderTypeItem[]> {
    return this.aiService.listActiveProviders('chat', true);
  }

  @Get('chat/models')
  @ApiOperation({
    summary: 'List available chat models',
    description:
      'Returns the active chat-capable models. When providerHandle is supplied, only models from that provider are returned.',
  })
  @ApiQuery({
    name: 'providerHandle',
    required: false,
    type: String,
    description:
      'Optional provider handle used to limit the result to one AI provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active chat models available to the current user.',
    type: AiProviderModelItem,
    isArray: true,
  })
  async listModels(
    @Query('providerHandle') providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    return this.aiService.listActiveModels(providerHandle, 'chat', true);
  }

  @Get('transcription/providers')
  @ApiOperation({
    summary: 'List available transcription providers',
    description:
      'Returns the active AI providers that can currently be used for audio transcription.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Active transcription providers available to the current user.',
    type: AiProviderTypeItem,
    isArray: true,
  })
  async listTranscriptionProviders(): Promise<AiProviderTypeItem[]> {
    return this.aiService.listActiveProviders('transcription', true);
  }

  @Get('transcription/models')
  @ApiOperation({
    summary: 'List available transcription models',
    description:
      'Returns the active transcription models. When providerHandle is supplied, only models from that provider are returned.',
  })
  @ApiQuery({
    name: 'providerHandle',
    required: false,
    type: String,
    description:
      'Optional provider handle used to limit the result to one transcription provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active transcription models available to the current user.',
    type: AiProviderModelItem,
    isArray: true,
  })
  async listTranscriptionModels(
    @Query('providerHandle') providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    return this.aiService.listActiveModels(
      providerHandle,
      'transcription',
      true,
    );
  }

  @Get('speech/providers')
  @ApiOperation({
    summary: 'List available speech providers',
    description:
      'Returns the active AI providers that can currently be used for speech synthesis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active speech providers available to the current user.',
    type: AiProviderTypeItem,
    isArray: true,
  })
  async listSpeechProviders(): Promise<AiProviderTypeItem[]> {
    return this.aiService.listActiveProviders('speech', true);
  }

  @Get('speech/models')
  @ApiOperation({
    summary: 'List available speech models',
    description:
      'Returns the active speech synthesis models. When providerHandle is supplied, only models from that provider are returned.',
  })
  @ApiQuery({
    name: 'providerHandle',
    required: false,
    type: String,
    description:
      'Optional provider handle used to limit the result to one speech provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active speech models available to the current user.',
    type: AiProviderModelItem,
    isArray: true,
  })
  async listSpeechModels(
    @Query('providerHandle') providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    return this.aiService.listActiveModels(providerHandle, 'speech', true);
  }

  @Post('chat/transcriptions')
  @ApiOperation({
    summary: 'Create a transcription draft from uploaded audio',
    description:
      'Uploads an audio file, runs transcription, and stores the resulting draft so it can be reused in chat workflows.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Multipart form-data payload containing the audio file and optional client context.',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file that should be transcribed.',
        },
        sessionHandle: {
          type: 'number',
          description:
            'Optional existing chat session handle used to link the transcription to a conversation.',
          nullable: true,
        },
        providerHandle: {
          type: 'string',
          description:
            'Optional AI provider handle that should perform the transcription.',
          nullable: true,
        },
        modelHandle: {
          type: 'string',
          description:
            'Optional transcription model handle that should be used for the request.',
          nullable: true,
        },
        language: {
          type: 'string',
          description:
            'Optional language hint for the input audio, for example en or de.',
          nullable: true,
        },
        routeName: {
          type: 'string',
          description: 'Optional frontend route name active at upload time.',
          nullable: true,
        },
        url: {
          type: 'string',
          description: 'Optional full frontend URL active at upload time.',
          nullable: true,
        },
        pageTitle: {
          type: 'string',
          description: 'Optional frontend page title active at upload time.',
          nullable: true,
        },
        clientCurrentDateTime: {
          type: 'string',
          description:
            'Optional client-side timestamp captured when the upload was started.',
          nullable: true,
        },
        clientTimeZone: {
          type: 'string',
          description:
            'Optional IANA timezone reported by the client, such as Europe/Berlin.',
          nullable: true,
        },
        clientLocale: {
          type: 'string',
          description: 'Optional client locale, such as en-US or de-DE.',
          nullable: true,
        },
        clientUtcOffsetMinutes: {
          type: 'number',
          description:
            'Optional offset from UTC in minutes reported by the client.',
          nullable: true,
        },
        durationSeconds: {
          type: 'number',
          description:
            'Optional audio duration reported by the client recorder in seconds.',
          nullable: true,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Persisted transcription draft with status, detected metadata, and linked document information.',
    type: AiChatTranscriptionResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async createTranscription(
    @Req() req: Request & { user: PersonItem },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateAiChatTranscriptionDto,
  ): Promise<AiChatTranscriptionResponseDto> {
    return this.aiService.createChatTranscription(body, file, req.user);
  }

  @Get('vectorization/providers')
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({
    summary: 'List available embedding providers',
    description:
      'Returns the active AI providers that can currently generate vector embeddings for semantic search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active embedding providers available to administrators.',
    type: AiProviderTypeItem,
    isArray: true,
  })
  async listVectorizationProviders(): Promise<AiProviderTypeItem[]> {
    return this.aiService.listActiveProviders('embedding');
  }

  @Get('vectorization/models')
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({
    summary: 'List available embedding models',
    description:
      'Returns the active embedding models. When providerHandle is supplied, only models from that provider are returned.',
  })
  @ApiQuery({
    name: 'providerHandle',
    required: false,
    type: String,
    description:
      'Optional provider handle used to limit the result to one embedding provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active embedding models available to administrators.',
    type: AiProviderModelItem,
    isArray: true,
  })
  async listVectorizationModels(
    @Query('providerHandle') providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    return this.aiService.listActiveModels(providerHandle, 'embedding');
  }

  @Post('vectorization')
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({
    summary: 'Generate embeddings for one entity type',
    description:
      'Runs vectorization for all supported records of the requested entity so they become available for semantic search.',
  })
  @ApiBody({ type: VectorizeEntityDto })
  @ApiResponse({
    status: 201,
    description:
      'Summary of the vectorization run, including processed, skipped, and deleted document counts.',
    type: VectorizeEntityResponseDto,
  })
  async vectorizeEntity(
    @Body() body: VectorizeEntityDto,
  ): Promise<VectorizeEntityResponseDto> {
    return this.aiService.vectorizeEntity(body);
  }

  @Get('chat/sessions')
  @ApiOperation({
    summary: 'List chat sessions',
    description:
      "Returns the authenticated user's persisted chat sessions. Archived sessions can be included on demand.",
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description:
      'Set to true to include archived sessions alongside active sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat sessions that belong to the authenticated user.',
    type: AiChatSessionItem,
    isArray: true,
  })
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
  @ApiOperation({
    summary: 'Create a chat session',
    description:
      'Creates an empty chat session for the authenticated user that can later receive chat messages.',
  })
  @ApiBody({ type: CreateAiChatSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Persisted chat session record.',
    type: AiChatSessionItem,
  })
  async createSession(
    @Req() req: Request & { user: PersonItem },
    @Body() body: CreateAiChatSessionDto,
  ): Promise<AiChatSessionItem> {
    return this.aiService.createChatSession(body, req.user);
  }

  @Patch('chat/sessions/:handle')
  @ApiOperation({
    summary: 'Update a chat session',
    description:
      'Updates chat session metadata such as the display title, archive state, or preferred provider and model settings.',
  })
  @ApiParam({
    name: 'handle',
    type: Number,
    description: 'Numeric handle of the chat session to update.',
  })
  @ApiBody({ type: UpdateAiChatSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Updated chat session record.',
    type: AiChatSessionItem,
  })
  async updateSession(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Body() body: UpdateAiChatSessionDto,
  ): Promise<AiChatSessionItem> {
    return this.aiService.updateChatSession(handle, body, req.user);
  }

  @Get('chat/sessions/:handle/messages')
  @ApiOperation({
    summary: 'List chat messages for one session',
    description:
      'Returns persisted chat messages for one session, with cursor-based pagination for loading older messages.',
  })
  @ApiParam({
    name: 'handle',
    type: Number,
    description:
      'Numeric handle of the chat session whose messages should be listed.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of messages to return in one page.',
  })
  @ApiQuery({
    name: 'beforeSequence',
    required: false,
    type: Number,
    description:
      'Cursor used to load messages with a smaller sequence number than the provided value.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated chat message list with cursor metadata for loading older messages.',
    type: AiChatMessageListResponseDto,
  })
  async listMessages(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Query() query: ListAiChatMessagesQueryDto,
  ): Promise<AiChatMessageListResponseDto> {
    return this.aiService.listChatMessages(handle, req.user, query);
  }

  @Post('chat/messages')
  @ApiOperation({
    summary: 'Create a user chat message',
    description:
      'Stores a new user message, creates a session when needed, and returns both the persisted session and message records.',
  })
  @ApiBody({ type: CreateAiChatMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Persisted session and user message records.',
    schema: {
      type: 'object',
      required: ['session', 'message'],
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

  @Post('chat/messages/:handle/speech')
  @ApiOperation({
    summary: 'Create or reuse speech audio for an assistant message',
    description:
      'Generates or reuses a speech synthesis asset for an assistant message and stores the resulting audio reference on the message.',
  })
  @ApiBody({ type: CreateAiChatMessageSpeechDto })
  @ApiParam({
    name: 'handle',
    type: 'number',
    description: 'Numeric handle of the assistant message to synthesize.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Updated assistant message record with the persisted speech artifact reference.',
    type: AiChatMessageItem,
  })
  async ensureAssistantMessageSpeech(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Body() body: CreateAiChatMessageSpeechDto,
  ): Promise<AiChatMessageItem> {
    return this.aiService.ensureAssistantMessageSpeech(handle, req.user, body);
  }

  @Post('chat/stream')
  @ApiOperation({
    summary: 'Create a user message and stream the assistant reply',
    description:
      'Persists the user message and streams structured NDJSON events for the assistant response, tool activity, and terminal errors.',
  })
  @ApiBody({ type: CreateAiChatMessageDto })
  @ApiProduces('application/x-ndjson')
  @ApiResponse({
    status: 200,
    description:
      'NDJSON event stream containing the persisted session context and streamed assistant response chunks.',
  })
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
