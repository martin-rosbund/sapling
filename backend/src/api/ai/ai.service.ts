import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PersonItem } from '../../entity/PersonItem';
import { AiAgentItem } from '../../entity/AiAgentItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiChatToolActionItem } from '../../entity/AiChatToolActionItem';
import { AiChatTranscriptionItem } from '../../entity/AiChatTranscriptionItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import { DocumentItem } from '../../entity/DocumentItem';
import {
  AiChatMessageListResponseDto,
  AiChatMessageListMetaDto,
  CreateAiChatMessageSpeechDto,
  CreateAiChatMessageDto,
  CreateAiChatSessionDto,
  ListAiChatMessagesQueryDto,
  UpdateAiChatSessionDto,
} from './dto/chat.dto';
import { McpService, type McpInlineToolExecution } from './mcp.service';
import { DocumentService } from '../document/document.service';
import {
  VectorizeEntityDto,
  VectorizeEntityResponseDto,
} from './dto/vectorization.dto';
import {
  AiChatTranscriptionResponseDto,
  CreateAiChatTranscriptionDto,
} from './dto/transcription.dto';
import {
  AI_CHAT_MESSAGE_PAGE_SIZE,
  AI_MAX_CHAT_MESSAGE_PAGE_SIZE,
  AI_STREAM_HISTORY_MESSAGE_LIMIT,
} from '../../constants/project.constants';
import {
  buildAssistantSpeechDescription,
  buildAssistantSpeechFailurePayload,
  buildAssistantSpeechFilename,
  buildAssistantSpeechPayload,
  normalizeAssistantSpeechText,
  prepareAssistantSpeechText,
} from './ai-speech.utils';
import {
  alignAssistantContentWithNavigationLinks,
  buildNavigationLinks,
} from './ai-navigation.utils';
import {
  synthesizeOpenAiSpeech,
  transcribeOpenAiAudio,
} from './openai-ai.runtime';
import {
  AiClientTimeContext,
  AiProviderCapability,
  AiPreparedSpeechText,
  AiStreamResult,
  AiToolRegistryEntry,
} from './ai.types';
import { AI_ASSISTANT_SPEECH_INSTRUCTIONS } from './prompts/ai.prompts';
import { extractClientTimeContext } from './ai-client-time.utils';
import { resolveMaxToolCallIterations } from './ai-tool-call.utils';
import {
  buildAssistantSpeechDescriptor,
  buildTranscriptionResponse,
  extractMessageSpeechPayload,
  extractModelHandle,
  extractProviderHandle,
  sanitizeChatMessage,
  sanitizeChatSession,
  sanitizeToolAction,
  shouldReuseAssistantSpeech,
  withMessageSpeechPayload,
} from './ai-response.utils';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { AiVectorService } from './ai-vector.service';
import { AiChatRuntimeService } from './ai-chat-runtime.service';
import { AiAgentPolicyService } from './ai-agent-policy.service';
import type { McpToolPolicy } from './mcp-policy.types';

type AiChatMessagePage = {
  messages: AiChatMessageItem[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextBeforeSequence: number | null;
  };
};

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for AI operations, including logic for asking questions and creating entities.
 *
 * @property        {ConfigService} configService  Service for accessing configuration values
 * @property        {'openai'|'gemini'} provider   AI provider type
 * @property        {OpenAI|null} openai           OpenAI client instance
 * @property        {GoogleGenerativeAI|null} gemini Gemini client instance
 *
 * @method          ask          Returns an answer to a question using the configured AI provider
 * @method          createEntity Creates a new entity (example logic, extendable)
 */
@Injectable()
export class AiService {
  /**
   * Service for accessing configuration values.
   * @type {ConfigService}
   */
  constructor(
    private readonly em: EntityManager,
    @Inject(forwardRef(() => McpService))
    private readonly mcpService: McpService,
    private readonly documentService: DocumentService,
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly vectorService: AiVectorService,
    private readonly chatRuntime: AiChatRuntimeService,
    private readonly agentPolicy: AiAgentPolicyService,
  ) {}

  async listActiveProviders(
    capability: AiProviderCapability = 'chat',
    configuredOnly = false,
  ): Promise<AiProviderTypeItem[]> {
    return this.providerRegistry.listActiveProviders(
      capability,
      configuredOnly,
    );
  }

  async listActiveModels(
    providerHandle?: string,
    capability: AiProviderCapability = 'chat',
    configuredOnly = false,
  ): Promise<AiProviderModelItem[]> {
    return this.providerRegistry.listActiveModels(
      providerHandle,
      capability,
      configuredOnly,
    );
  }

  async vectorizeEntity(
    dto: VectorizeEntityDto,
  ): Promise<VectorizeEntityResponseDto> {
    return this.vectorService.vectorizeEntity(dto);
  }

  async searchVectorDocuments(
    entityHandle: string,
    query: string,
    user: PersonItem,
    limit = 5,
  ): Promise<Record<string, unknown>> {
    return this.vectorService.searchVectorDocuments(
      entityHandle,
      query,
      user,
      limit,
    );
  }

  async listAccessibleAgents(user: PersonItem): Promise<AiAgentItem[]> {
    return this.agentPolicy.listAccessibleAgents(user);
  }

  async streamChatMessage(
    dto: CreateAiChatMessageDto,
    user: PersonItem,
    onEvent: (event: Record<string, unknown>) => Promise<void> | void,
  ): Promise<{
    session: AiChatSessionItem;
    userMessage: AiChatMessageItem;
    assistantMessage: AiChatMessageItem;
  }> {
    const person = await this.requireManagedUser(user);
    const session = dto.sessionHandle
      ? await this.findOwnedSession(dto.sessionHandle, user)
      : await this.createManagedChatSession(
          {
            title: dto.sessionTitle ?? this.buildSessionTitle(dto.content),
            providerHandle: dto.providerHandle,
            modelHandle: dto.modelHandle,
            agentHandle: dto.agentHandle,
          },
          user,
        );

    const nextSequence = await this.getNextSequence(session.handle ?? 0);
    const agent = await this.agentPolicy.resolveAgentForChat(
      dto.agentHandle,
      session.agent,
      user,
    );
    const toolPolicy = this.agentPolicy.buildToolPolicy(agent);
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ??
        extractProviderHandle(agent?.provider) ??
        extractProviderHandle(session.provider),
      dto.modelHandle ??
        extractModelHandle(agent?.model) ??
        extractModelHandle(session.model),
    );
    const availableTools = await this.mcpService.listActiveTools(
      user,
      toolPolicy,
    );
    const clientTimeContext = extractClientTimeContext(dto);

    const userMessage = this.em.create(AiChatMessageItem, {
      session,
      person,
      role: 'user',
      status: 'persisted',
      sequence: nextSequence,
      content: dto.content,
      contextPayload: dto.contextPayload ?? null,
      provider: runtimeTarget.provider.handle,
      model: runtimeTarget.model.providerModel,
      url: dto.url ?? null,
      routeName: dto.routeName ?? null,
      pageTitle: dto.pageTitle ?? null,
      requestPayload: {
        routeName: dto.routeName ?? null,
        url: dto.url ?? null,
        pageTitle: dto.pageTitle ?? null,
        transcriptionHandle: dto.transcriptionHandle ?? null,
        clientCurrentDateTime:
          clientTimeContext?.currentDate?.toISOString() ?? null,
        clientTimeZone: clientTimeContext?.timeZone ?? null,
        clientLocale: clientTimeContext?.locale ?? null,
        clientUtcOffsetMinutes: clientTimeContext?.utcOffsetMinutes ?? null,
        contextPayload: dto.contextPayload ?? null,
      },
    });

    const assistantMessage = this.em.create(AiChatMessageItem, {
      session,
      person,
      role: 'assistant',
      status: 'streaming',
      sequence: nextSequence + 1,
      content: '',
      provider: runtimeTarget.provider.handle,
      model: runtimeTarget.model.providerModel,
      contextPayload: dto.contextPayload ?? null,
      url: dto.url ?? null,
      routeName: dto.routeName ?? null,
      pageTitle: dto.pageTitle ?? null,
    });

    session.provider = runtimeTarget.provider;
    session.model = runtimeTarget.model;
    session.agent = agent;
    session.lastMessageAt = new Date();
    this.em.persist([userMessage, assistantMessage]);
    await this.em.flush();
    await this.linkTranscriptionToMessage(
      dto.transcriptionHandle,
      session,
      userMessage,
      user,
    );
    await this.populateChatSession(session);

    await onEvent({
      type: 'session.upsert',
      session: sanitizeChatSession(session),
    });
    await onEvent({
      type: 'message.user',
      message: sanitizeChatMessage(userMessage),
    });
    await onEvent({
      type: 'message.assistant',
      message: sanitizeChatMessage(assistantMessage),
    });
    await onEvent({ type: 'mcp.tools', tools: availableTools });

    const inlineToolExecution =
      await this.mcpService.tryExecuteInlineToolCommand(
        dto.content,
        user,
        toolPolicy,
      );

    if (inlineToolExecution) {
      const navigationLinks = buildNavigationLinks([
        {
          serverHandle: inlineToolExecution.serverHandle,
          serverName: inlineToolExecution.serverName,
          toolName: inlineToolExecution.toolName,
          arguments: inlineToolExecution.arguments,
          modelResult: inlineToolExecution.modelResult,
          rawResult: inlineToolExecution.rawResult,
        },
      ]);

      assistantMessage.content = inlineToolExecution.content;
      assistantMessage.status = 'completed';
      assistantMessage.toolCalls = [
        {
          serverHandle: inlineToolExecution.serverHandle,
          serverName: inlineToolExecution.serverName,
          toolName: inlineToolExecution.toolName,
          arguments: inlineToolExecution.arguments,
        },
      ];
      assistantMessage.responsePayload = {
        source: 'mcp-inline-tool',
        provider: runtimeTarget.provider.handle,
        model: runtimeTarget.model.providerModel,
        rawResult: inlineToolExecution.rawResult,
        navigationLinks,
      };
      await this.em.flush();
      await onEvent({
        type: 'message.completed',
        message: sanitizeChatMessage(assistantMessage),
        session: sanitizeChatSession(session),
      });
      return { session, userMessage, assistantMessage };
    }

    try {
      const history = await this.loadSessionHistory(
        session.handle ?? 0,
        this.requireUserHandle(person),
      );

      let streamResult: AiStreamResult;
      const maxToolCallIterations = resolveMaxToolCallIterations(
        runtimeTarget.model,
      );

      if (runtimeTarget.providerKind === 'gemini') {
        streamResult = await this.chatRuntime.streamGemini(
          history,
          runtimeTarget.provider,
          runtimeTarget.model.providerModel,
          availableTools,
          user,
          maxToolCallIterations,
          clientTimeContext,
          async (delta) => {
            if (!delta) {
              return;
            }

            assistantMessage.content += delta;
            await onEvent({
              type: 'message.delta',
              handle: assistantMessage.handle,
              delta,
            });
          },
          runtimeTarget.model.supportsTools,
          this.agentPolicy.buildAgentInstruction(agent),
          (entry, args) =>
            this.executePolicyAwareToolCall(
              entry,
              args,
              user,
              person,
              session,
              assistantMessage,
              agent,
              toolPolicy,
              onEvent,
            ),
        );
      } else {
        streamResult = await this.chatRuntime.streamOpenAi(
          history,
          runtimeTarget.provider,
          runtimeTarget.model.providerModel,
          availableTools,
          user,
          maxToolCallIterations,
          clientTimeContext,
          async (delta) => {
            if (!delta) {
              return;
            }

            assistantMessage.content += delta;
            await onEvent({
              type: 'message.delta',
              handle: assistantMessage.handle,
              delta,
            });
          },
          runtimeTarget.model.supportsTools,
          this.agentPolicy.buildAgentInstruction(agent),
          (entry, args) =>
            this.executePolicyAwareToolCall(
              entry,
              args,
              user,
              person,
              session,
              assistantMessage,
              agent,
              toolPolicy,
              onEvent,
            ),
        );
      }

      assistantMessage.toolCalls = streamResult.toolCalls.map((toolCall) => ({
        serverHandle: toolCall.serverHandle,
        serverName: toolCall.serverName,
        toolName: toolCall.toolName,
        arguments: toolCall.arguments,
      }));

      assistantMessage.status = 'completed';
      const navigationLinks = buildNavigationLinks(streamResult.toolCalls);
      const pendingToolActions = await this.loadPendingToolActionsForMessage(
        assistantMessage,
        user,
      );
      assistantMessage.content = alignAssistantContentWithNavigationLinks(
        assistantMessage.content,
        navigationLinks,
        dto.url ?? null,
      );
      assistantMessage.responsePayload = {
        provider: runtimeTarget.provider.handle,
        model: runtimeTarget.model.providerModel,
        completedAt: new Date().toISOString(),
        navigationLinks,
        toolResults: streamResult.toolCalls.map((toolCall) => ({
          serverHandle: toolCall.serverHandle,
          serverName: toolCall.serverName,
          toolName: toolCall.toolName,
          arguments: toolCall.arguments,
          rawResult: toolCall.rawResult,
        })),
        pendingToolActions: pendingToolActions.map((action) =>
          sanitizeToolAction(action),
        ),
      };
      await this.em.flush();

      await onEvent({
        type: 'message.completed',
        message: sanitizeChatMessage(assistantMessage),
        session: sanitizeChatSession(session),
      });
      return { session, userMessage, assistantMessage };
    } catch (error) {
      assistantMessage.status = 'failed';
      assistantMessage.responsePayload = {
        provider: runtimeTarget.provider.handle,
        model: runtimeTarget.model.providerModel,
        error: error instanceof Error ? error.message : 'ai.unknownError',
      };
      await this.em.flush();
      throw error;
    }
  }

  async listChatSessions(
    user: PersonItem,
    includeArchived = false,
  ): Promise<AiChatSessionItem[]> {
    const userHandle = this.requireUserHandle(user);

    const sessions = await this.em.find(
      AiChatSessionItem,
      {
        person: { handle: userHandle },
        isArchived: includeArchived,
      },
      {
        populate: [
          'provider',
          'model',
          'model.provider',
          'agent',
          'agent.provider',
          'agent.model',
          'agent.model.provider',
        ],
        orderBy: { updatedAt: 'DESC' },
      },
    );

    return sessions.map((session) => sanitizeChatSession(session));
  }

  async createChatSession(
    dto: CreateAiChatSessionDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const session = await this.createManagedChatSession(dto, user);
    return sanitizeChatSession(session);
  }

  private async createManagedChatSession(
    dto: CreateAiChatSessionDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const person = await this.requireManagedUser(user);
    const agent = await this.agentPolicy.resolveAgentForChat(
      dto.agentHandle,
      null,
      user,
    );
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ?? extractProviderHandle(agent?.provider) ?? null,
      dto.modelHandle ?? extractModelHandle(agent?.model) ?? null,
    );

    const session = this.em.create(AiChatSessionItem, {
      title: dto.title?.trim() || 'New Chat',
      isArchived: false,
      provider: runtimeTarget.provider,
      model: runtimeTarget.model,
      agent,
      person,
      lastMessageAt: null,
    });

    this.em.persist(session);
    await this.em.flush();
    await this.populateChatSession(session);
    return session;
  }

  async updateChatSession(
    handle: number,
    dto: UpdateAiChatSessionDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const session = await this.findOwnedSession(handle, user);

    if (dto.title !== undefined) {
      session.title = dto.title.trim() || session.title;
    }

    if (dto.isArchived !== undefined) {
      session.isArchived = dto.isArchived;
    }

    if (dto.providerHandle !== undefined || dto.modelHandle !== undefined) {
      const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
        dto.providerHandle ?? extractProviderHandle(session.provider),
        dto.modelHandle ?? extractModelHandle(session.model),
      );
      session.provider = runtimeTarget.provider;
      session.model = runtimeTarget.model;
    }

    if (dto.agentHandle !== undefined) {
      const agent = await this.agentPolicy.resolveAgentForChat(
        dto.agentHandle,
        session.agent,
        user,
      );
      session.agent = agent;
      if (
        agent &&
        dto.providerHandle === undefined &&
        dto.modelHandle === undefined
      ) {
        const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
          extractProviderHandle(agent.provider) ??
            extractProviderHandle(session.provider),
          extractModelHandle(agent.model) ?? extractModelHandle(session.model),
        );
        session.provider = runtimeTarget.provider;
        session.model = runtimeTarget.model;
      }
    }

    await this.em.flush();
    await this.populateChatSession(session);
    return sanitizeChatSession(session);
  }

  async listChatMessages(
    sessionHandle: number,
    user: PersonItem,
    query: ListAiChatMessagesQueryDto = new ListAiChatMessagesQueryDto(),
  ): Promise<AiChatMessageListResponseDto> {
    const userHandle = this.requireUserHandle(user);
    await this.findOwnedSession(sessionHandle, user);
    const page = await this.fetchChatMessagePage(sessionHandle, userHandle, {
      limit: query.limit,
      beforeSequence: query.beforeSequence,
    });

    const response = new AiChatMessageListResponseDto();
    response.data = page.messages.map((message) =>
      sanitizeChatMessage(message),
    );
    response.meta = Object.assign(new AiChatMessageListMetaDto(), page.meta);
    return response;
  }

  async createChatMessage(
    dto: CreateAiChatMessageDto,
    user: PersonItem,
  ): Promise<{ session: AiChatSessionItem; message: AiChatMessageItem }> {
    const person = await this.requireManagedUser(user);
    const session = dto.sessionHandle
      ? await this.findOwnedSession(dto.sessionHandle, user)
      : await this.createManagedChatSession(
          {
            title: dto.sessionTitle ?? this.buildSessionTitle(dto.content),
            providerHandle: dto.providerHandle,
            modelHandle: dto.modelHandle,
            agentHandle: dto.agentHandle,
          },
          user,
        );

    const agent = await this.agentPolicy.resolveAgentForChat(
      dto.agentHandle,
      session.agent,
      user,
    );
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ??
        extractProviderHandle(agent?.provider) ??
        extractProviderHandle(session.provider),
      dto.modelHandle ??
        extractModelHandle(agent?.model) ??
        extractModelHandle(session.model),
    );
    const clientTimeContext = extractClientTimeContext(dto);

    const latestMessage = await this.em.find(
      AiChatMessageItem,
      { session: { handle: session.handle } },
      { orderBy: { sequence: 'DESC' }, limit: 1 },
    );

    const message = this.em.create(AiChatMessageItem, {
      session,
      person,
      role: 'user',
      status: 'persisted',
      sequence: (latestMessage[0]?.sequence ?? 0) + 1,
      content: dto.content,
      contextPayload: dto.contextPayload ?? null,
      provider: runtimeTarget.provider.handle,
      model: runtimeTarget.model.providerModel,
      url: dto.url ?? null,
      routeName: dto.routeName ?? null,
      pageTitle: dto.pageTitle ?? null,
      requestPayload: {
        routeName: dto.routeName ?? null,
        url: dto.url ?? null,
        pageTitle: dto.pageTitle ?? null,
        transcriptionHandle: dto.transcriptionHandle ?? null,
        clientCurrentDateTime:
          clientTimeContext?.currentDate?.toISOString() ?? null,
        clientTimeZone: clientTimeContext?.timeZone ?? null,
        clientLocale: clientTimeContext?.locale ?? null,
        clientUtcOffsetMinutes: clientTimeContext?.utcOffsetMinutes ?? null,
        contextPayload: dto.contextPayload ?? null,
      },
    });

    session.lastMessageAt = new Date();
    session.provider = runtimeTarget.provider;
    session.model = runtimeTarget.model;
    session.agent = agent;
    if (!session.title?.trim()) {
      session.title = this.buildSessionTitle(dto.content);
    }

    this.em.persist(message);
    await this.em.flush();
    await this.linkTranscriptionToMessage(
      dto.transcriptionHandle,
      session,
      message,
      user,
    );
    await this.populateChatSession(session);
    return {
      session: sanitizeChatSession(session),
      message: sanitizeChatMessage(message),
    };
  }

  async ensureAssistantMessageSpeech(
    handle: number,
    user: PersonItem,
    dto: CreateAiChatMessageSpeechDto = {},
  ): Promise<AiChatMessageItem> {
    const person = await this.requireManagedUser(user);
    const message = await this.findOwnedMessage(handle, user);

    if (message.role !== 'assistant') {
      throw new BadRequestException(
        'ai.speechOnlySupportedForAssistantMessages',
      );
    }

    const existingSpeechPayload = extractMessageSpeechPayload(
      message.responsePayload,
    );
    const existingDocumentHandle =
      existingSpeechPayload?.documentHandle ?? null;
    const requestedSpeechTarget =
      dto.providerHandle?.trim() || dto.modelHandle?.trim()
        ? await this.providerRegistry.resolveSpeechTarget(
            dto.providerHandle ?? null,
            dto.modelHandle ?? null,
          )
        : null;
    const requestedSpeechDescriptor = buildAssistantSpeechDescriptor(
      requestedSpeechTarget,
    );

    if (existingDocumentHandle != null) {
      const existingDocument = await this.em.findOne(DocumentItem, {
        handle: existingDocumentHandle,
      });

      if (
        existingDocument &&
        shouldReuseAssistantSpeech(
          existingSpeechPayload,
          requestedSpeechTarget ? requestedSpeechDescriptor : null,
        )
      ) {
        return sanitizeChatMessage(message);
      }
    }

    const normalizedSpeechText = normalizeAssistantSpeechText(message.content);
    let preparedSpeechText: AiPreparedSpeechText = {
      text: normalizedSpeechText,
      sourceTextLength: normalizedSpeechText.length,
      wasTruncated: false,
    };
    let speechDescriptor = buildAssistantSpeechDescriptor(null);

    try {
      const speechTarget =
        requestedSpeechTarget ??
        (await this.providerRegistry.resolveSpeechTarget());
      speechDescriptor = buildAssistantSpeechDescriptor(speechTarget);
      preparedSpeechText = prepareAssistantSpeechText(
        message.content,
        speechTarget.maxInputLength,
      );

      if (!preparedSpeechText.text) {
        throw new BadRequestException('ai.speechInputEmpty');
      }

      const speechInstructions = String(AI_ASSISTANT_SPEECH_INSTRUCTIONS);
      const audioBuffer = await synthesizeOpenAiSpeech({
        provider: speechTarget.provider,
        model: speechTarget.model.providerModel,
        voice: speechTarget.voice,
        input: preparedSpeechText.text,
        responseFormat: speechTarget.fileExtension,
        instructions: speechInstructions,
        speed: speechTarget.speed,
      });
      const document = await this.documentService.uploadDocument(
        {
          buffer: audioBuffer,
          originalname: buildAssistantSpeechFilename(
            message,
            speechTarget.fileExtension,
          ),
          mimetype: speechTarget.mimeType,
          size: audioBuffer.length,
        } as Express.Multer.File,
        'aiChatMessage',
        String(message.handle ?? ''),
        'aiChatAudio',
        person,
        buildAssistantSpeechDescription(message),
      );

      message.responsePayload = withMessageSpeechPayload(
        message.responsePayload,
        buildAssistantSpeechPayload(
          preparedSpeechText,
          document,
          speechDescriptor,
        ),
      );
      await this.em.flush();
      return sanitizeChatMessage(message);
    } catch (error) {
      message.responsePayload = withMessageSpeechPayload(
        message.responsePayload,
        buildAssistantSpeechFailurePayload(
          preparedSpeechText,
          error,
          speechDescriptor,
        ),
      );
      await this.em.flush();
      throw error;
    }
  }

  async confirmToolAction(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatToolActionItem> {
    const action = await this.findOwnedToolAction(handle, user);

    if (action.status !== 'pending') {
      throw new BadRequestException('ai.toolActionNotPending');
    }

    if (action.expiresAt && action.expiresAt.getTime() < Date.now()) {
      action.status = 'expired';
      action.errorPayload = { error: 'ai.toolActionExpired' };
      await this.em.flush();
      throw new BadRequestException('ai.toolActionExpired');
    }

    try {
      const basePolicy =
        this.agentPolicy.buildToolPolicy(
          action.agent && typeof action.agent !== 'string'
            ? action.agent
            : null,
        ) ?? {};
      const policy = {
        ...basePolicy,
        blockMutatingTools: false,
      };
      const result = await this.mcpService.executeTool(
        action.serverName,
        action.toolName,
        action.arguments ?? {},
        user,
        policy,
      );

      action.status = 'executed';
      action.resultPayload = {
        content: result.content,
        modelResult: result.modelResult,
        rawResult: result.rawResult,
      };
      action.executedAt = new Date();
      await this.em.flush();
      return sanitizeToolAction(action);
    } catch (error) {
      action.status = 'failed';
      action.errorPayload = {
        error: error instanceof Error ? error.message : String(error),
      };
      action.executedAt = new Date();
      await this.em.flush();
      throw error;
    }
  }

  async rejectToolAction(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatToolActionItem> {
    const action = await this.findOwnedToolAction(handle, user);

    if (action.status !== 'pending') {
      throw new BadRequestException('ai.toolActionNotPending');
    }

    action.status = 'rejected';
    action.executedAt = new Date();
    await this.em.flush();
    return sanitizeToolAction(action);
  }

  private async executePolicyAwareToolCall(
    entry: AiToolRegistryEntry,
    args: Record<string, unknown>,
    user: PersonItem,
    person: PersonItem,
    session: AiChatSessionItem,
    message: AiChatMessageItem,
    agent: AiAgentItem | null,
    policy: McpToolPolicy | undefined,
    onEvent: (event: Record<string, unknown>) => Promise<void> | void,
  ): Promise<McpInlineToolExecution> {
    const descriptor = entry.descriptor;

    if (agent && this.agentPolicy.isMutatingTool(descriptor.toolName)) {
      if (agent.mutationMode === 'readOnly') {
        return {
          serverHandle: descriptor.serverHandle,
          serverName: descriptor.serverName,
          toolName: descriptor.toolName,
          arguments: args,
          content: JSON.stringify(
            {
              ok: false,
              error: 'ai.agentReadOnly',
            },
            null,
            2,
          ),
          modelResult: {
            ok: false,
            error: 'ai.agentReadOnly',
          },
          rawResult: {
            ok: false,
            error: 'ai.agentReadOnly',
          },
        };
      }

      const action = await this.createPendingToolAction(
        descriptor.serverName,
        descriptor.toolName,
        args,
        person,
        session,
        message,
        agent,
      );
      const sanitizedAction = sanitizeToolAction(action);

      await onEvent({
        type: 'tool.action.pending',
        action: sanitizedAction,
      });

      return {
        serverHandle: descriptor.serverHandle,
        serverName: descriptor.serverName,
        toolName: descriptor.toolName,
        arguments: args,
        content: JSON.stringify(
          {
            pendingToolAction: true,
            actionHandle: action.handle,
            serverName: descriptor.serverName,
            toolName: descriptor.toolName,
            status: 'pending',
            message:
              'The action has been prepared and is waiting for explicit user confirmation in Sapling.',
          },
          null,
          2,
        ),
        modelResult: {
          pendingToolAction: true,
          actionHandle: action.handle,
          serverName: descriptor.serverName,
          toolName: descriptor.toolName,
          status: 'pending',
        },
        rawResult: {
          pendingToolAction: true,
          actionHandle: action.handle,
          action: sanitizedAction,
        },
      };
    }

    return this.mcpService.executeTool(
      descriptor.serverName,
      descriptor.toolName,
      args,
      user,
      policy,
    );
  }

  private async createPendingToolAction(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
    person: PersonItem,
    session: AiChatSessionItem,
    message: AiChatMessageItem,
    agent: AiAgentItem,
  ): Promise<AiChatToolActionItem> {
    const action = this.em.create(AiChatToolActionItem, {
      session,
      message,
      person,
      agent,
      serverName,
      toolName,
      arguments: args,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    this.em.persist(action);
    await this.em.flush();
    return action;
  }

  private async loadPendingToolActionsForMessage(
    message: AiChatMessageItem,
    user: PersonItem,
  ): Promise<AiChatToolActionItem[]> {
    if (message.handle == null) {
      return [];
    }

    return this.em.find(
      AiChatToolActionItem,
      {
        message: { handle: message.handle },
        person: { handle: this.requireUserHandle(user) },
        status: 'pending',
      },
      { populate: ['session', 'message', 'person', 'agent'] },
    );
  }

  private async findOwnedSession(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const userHandle = this.requireUserHandle(user);

    const session = await this.em.findOne(
      AiChatSessionItem,
      {
        handle,
        person: { handle: userHandle },
      },
      {
        populate: [
          'provider',
          'model',
          'model.provider',
          'agent',
          'agent.provider',
          'agent.model',
          'agent.model.provider',
        ],
      },
    );

    if (!session) {
      throw new NotFoundException('global.notFound');
    }

    return session;
  }

  private async findOwnedMessage(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatMessageItem> {
    const userHandle = this.requireUserHandle(user);
    const message = await this.em.findOne(
      AiChatMessageItem,
      {
        handle,
        person: { handle: userHandle },
      },
      { populate: ['session'] },
    );

    if (!message) {
      throw new NotFoundException('global.notFound');
    }

    return message;
  }

  private async findOwnedToolAction(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatToolActionItem> {
    const userHandle = this.requireUserHandle(user);
    const action = await this.em.findOne(
      AiChatToolActionItem,
      {
        handle,
        person: { handle: userHandle },
      },
      {
        populate: [
          'session',
          'message',
          'person',
          'agent',
          'agent.provider',
          'agent.model',
          'agent.model.provider',
        ],
      },
    );

    if (!action) {
      throw new NotFoundException('ai.toolActionNotFound');
    }

    return action;
  }

  private buildSessionTitle(content: string): string {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return 'New Chat';
    }

    return trimmedContent.length > 80
      ? `${trimmedContent.slice(0, 77).trimEnd()}...`
      : trimmedContent;
  }

  private requireUserHandle(user: PersonItem): number {
    if (user.handle == null) {
      throw new NotFoundException('auth.userNotFound');
    }

    return user.handle;
  }

  private async requireManagedUser(user: PersonItem): Promise<PersonItem> {
    const person = await this.em.findOne(PersonItem, {
      handle: this.requireUserHandle(user),
    });

    if (!person) {
      throw new NotFoundException('auth.userNotFound');
    }

    return person;
  }

  async createChatTranscription(
    dto: CreateAiChatTranscriptionDto,
    file: Express.Multer.File | undefined,
    user: PersonItem,
  ): Promise<AiChatTranscriptionResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('ai.transcriptionFileRequired');
    }

    const person = await this.requireManagedUser(user);
    const session = dto.sessionHandle
      ? await this.findOwnedSession(dto.sessionHandle, user)
      : null;
    const target = await this.providerRegistry.resolveTranscriptionTarget(
      dto.providerHandle ?? null,
      dto.modelHandle ?? null,
    );
    const clientTimeContext = extractClientTimeContext(dto);

    const transcription = this.em.create(AiChatTranscriptionItem, {
      session,
      person,
      provider: target.provider,
      model: target.model,
      status: 'processing',
      mimeType: file.mimetype,
      byteLength: file.size,
      durationSeconds: dto.durationSeconds ?? null,
      transcript: null,
      detectedLanguage: null,
      requestPayload: {
        routeName: dto.routeName ?? null,
        url: dto.url ?? null,
        pageTitle: dto.pageTitle ?? null,
        language: dto.language ?? null,
        clientCurrentDateTime:
          clientTimeContext?.currentDate?.toISOString() ?? null,
        clientTimeZone: clientTimeContext?.timeZone ?? null,
        clientLocale: clientTimeContext?.locale ?? null,
        clientUtcOffsetMinutes: clientTimeContext?.utcOffsetMinutes ?? null,
        file: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      },
    });

    this.em.persist(transcription);
    await this.em.flush();

    try {
      const document = await this.documentService.uploadDocument(
        file,
        'aiChatTranscription',
        String(transcription.handle ?? ''),
        'aiChatAudio',
        person,
        dto.pageTitle?.trim() || undefined,
      );

      transcription.document = document;

      const response = await transcribeOpenAiAudio({
        provider: target.provider,
        model: target.model.providerModel,
        fileBuffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        language: dto.language?.trim() || undefined,
      });

      transcription.status = 'completed';
      transcription.transcript = response.text?.trim() || null;
      transcription.detectedLanguage = response.language?.trim() || null;
      transcription.durationSeconds =
        response.duration ?? transcription.durationSeconds ?? null;
      transcription.responsePayload = {
        providerHandle: target.provider.handle,
        modelHandle: target.model.handle,
        usage: response.usage ?? null,
      };
      await this.em.flush();

      return buildTranscriptionResponse(transcription);
    } catch (error) {
      transcription.status = 'failed';
      transcription.failurePayload = {
        error:
          error instanceof Error ? error.message : 'ai.transcriptionFailed',
      };
      await this.em.flush();
      throw error;
    }
  }

  private async populateChatSession(session: AiChatSessionItem): Promise<void> {
    await this.em.populate(session, [
      'provider',
      'model',
      'model.provider',
      'agent',
      'agent.provider',
      'agent.model',
      'agent.model.provider',
    ]);
  }

  private async getNextSequence(sessionHandle: number): Promise<number> {
    const latestMessage = await this.em.find(
      AiChatMessageItem,
      { session: { handle: sessionHandle } },
      { orderBy: { sequence: 'DESC' }, limit: 1 },
    );

    return (latestMessage[0]?.sequence ?? 0) + 1;
  }

  private async loadSessionHistory(
    sessionHandle: number,
    userHandle: number,
  ): Promise<AiChatMessageItem[]> {
    const page = await this.fetchChatMessagePage(sessionHandle, userHandle, {
      limit: AI_STREAM_HISTORY_MESSAGE_LIMIT,
    });

    return page.messages;
  }

  private async fetchChatMessagePage(
    sessionHandle: number,
    userHandle: number,
    options?: {
      limit?: number;
      beforeSequence?: number;
    },
  ): Promise<AiChatMessagePage> {
    const limit = this.normalizeChatMessageLimit(options?.limit);
    const beforeSequence = this.normalizeBeforeSequence(
      options?.beforeSequence,
    );
    const messages = await this.em.find(
      AiChatMessageItem,
      {
        session: { handle: sessionHandle },
        person: { handle: userHandle },
        ...(beforeSequence != null
          ? { sequence: { $lt: beforeSequence } }
          : {}),
      },
      {
        orderBy: { sequence: 'DESC' },
        limit: limit + 1,
      },
    );
    const hasMore = messages.length > limit;
    const windowedMessages = hasMore ? messages.slice(0, limit) : messages;
    const orderedMessages = [...windowedMessages].reverse();

    return {
      messages: orderedMessages,
      meta: {
        limit,
        hasMore,
        nextBeforeSequence: hasMore
          ? (orderedMessages[0]?.sequence ?? null)
          : null,
      },
    };
  }

  private normalizeChatMessageLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
      return AI_CHAT_MESSAGE_PAGE_SIZE;
    }

    return Math.min(
      AI_MAX_CHAT_MESSAGE_PAGE_SIZE,
      Math.max(1, Math.trunc(limit ?? AI_CHAT_MESSAGE_PAGE_SIZE)),
    );
  }

  private normalizeBeforeSequence(beforeSequence?: number): number | undefined {
    if (!Number.isFinite(beforeSequence)) {
      return undefined;
    }

    const normalized = Math.trunc(beforeSequence ?? 0);
    return normalized > 0 ? normalized : undefined;
  }

  private buildSystemInstruction(options?: {
    includeToolGuidance?: boolean;
    user?: PersonItem;
    clientTimeContext?: AiClientTimeContext;
  }): string {
    return this.chatRuntime.buildSystemInstruction(options);
  }

  private async executeAutomaticToolCall(
    toolRegistry: AiToolRegistryEntry[],
    encodedName: string,
    args: Record<string, unknown>,
    user: PersonItem,
  ) {
    return this.chatRuntime.executeAutomaticToolCall(
      toolRegistry,
      encodedName,
      args,
      user,
    );
  }

  private async findOwnedTranscription(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatTranscriptionItem> {
    const userHandle = this.requireUserHandle(user);
    const transcription = await this.em.findOne(
      AiChatTranscriptionItem,
      {
        handle,
        person: { handle: userHandle },
      },
      {
        populate: ['document', 'provider', 'model', 'session', 'message'],
      },
    );

    if (!transcription) {
      throw new NotFoundException('ai.transcriptionNotFound');
    }

    return transcription;
  }

  private async linkTranscriptionToMessage(
    transcriptionHandle: number | undefined,
    session: AiChatSessionItem,
    message: AiChatMessageItem,
    user: PersonItem,
  ): Promise<void> {
    if (!transcriptionHandle) {
      return;
    }

    const transcription = await this.findOwnedTranscription(
      transcriptionHandle,
      user,
    );

    transcription.session = session;
    transcription.message = message;
    await this.em.flush();
  }
}
