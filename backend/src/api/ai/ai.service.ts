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
import { AiAgentEvaluationItem } from '../../entity/AiAgentEvaluationItem';
import { AiAgentMemoryItem } from '../../entity/AiAgentMemoryItem';
import { AiAgentPlaybookItem } from '../../entity/AiAgentPlaybookItem';
import { AiAgentRunItem } from '../../entity/AiAgentRunItem';
import { AiAgentVersionItem } from '../../entity/AiAgentVersionItem';
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
  ApplyAiChatSessionPlaybookDto,
  CreateAiAgentEvaluationDto,
  CreateAiAgentTestRunDto,
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
  sanitizeAgent,
  sanitizeAgentEvaluation,
  sanitizeAgentMemory,
  sanitizeAgentPlaybook,
  sanitizeAgentRun,
  sanitizeAgentVersion,
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

type AgentRuntimeContext = {
  agent: AiAgentItem | null;
  version: AiAgentVersionItem | null;
  playbook: AiAgentPlaybookItem | null;
  memories: AiAgentMemoryItem[];
  toolPolicy: McpToolPolicy | undefined;
  instruction: string | null;
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

  async getAgentWorkbench(
    agentHandle: string,
    user: PersonItem,
  ): Promise<Record<string, unknown>> {
    const agent = await this.agentPolicy.requireAccessibleAgent(
      agentHandle,
      user,
    );
    const [versions, playbooks, memories, runs, evaluations] =
      await Promise.all([
        this.em.find(
          AiAgentVersionItem,
          { agent: { handle: agent.handle } },
          {
            populate: ['agent', 'provider', 'model', 'model.provider'],
            orderBy: { version: 'DESC' },
            limit: 20,
          },
        ),
        this.em.find(
          AiAgentPlaybookItem,
          { agent: { handle: agent.handle } },
          { populate: ['agent'], orderBy: { sortOrder: 'ASC', title: 'ASC' } },
        ),
        this.loadAccessibleMemories(agent, user),
        this.em.find(
          AiAgentRunItem,
          { agent: { handle: agent.handle } },
          {
            populate: ['agent', 'agentVersion', 'playbook', 'person'],
            orderBy: { startedAt: 'DESC' },
            limit: 25,
          },
        ),
        this.em.find(
          AiAgentEvaluationItem,
          { agent: { handle: agent.handle } },
          {
            populate: ['agent', 'agentVersion'],
            orderBy: { updatedAt: 'DESC' },
            limit: 50,
          },
        ),
      ]);

    return {
      agent: sanitizeAgent(agent),
      versions: versions.map((version) => sanitizeAgentVersion(version)),
      playbooks: playbooks.map((playbook) => sanitizeAgentPlaybook(playbook)),
      memories: memories.map((memory) => sanitizeAgentMemory(memory)),
      runs: runs.map((run) => sanitizeAgentRun(run)),
      evaluations: evaluations.map((evaluation) =>
        sanitizeAgentEvaluation(evaluation),
      ),
      stats: this.buildAgentWorkbenchStats(runs, evaluations),
    };
  }

  async listAgentRuns(
    agentHandle: string,
    user: PersonItem,
  ): Promise<AiAgentRunItem[]> {
    const agent = await this.agentPolicy.requireAccessibleAgent(
      agentHandle,
      user,
    );

    const runs = await this.em.find(
      AiAgentRunItem,
      { agent: { handle: agent.handle } },
      {
        populate: ['agent', 'agentVersion', 'playbook', 'person'],
        orderBy: { startedAt: 'DESC' },
        limit: 100,
      },
    );

    return runs.map((run) => sanitizeAgentRun(run));
  }

  async listAgentEvaluations(
    agentHandle: string,
    user: PersonItem,
  ): Promise<AiAgentEvaluationItem[]> {
    const agent = await this.agentPolicy.requireAccessibleAgent(
      agentHandle,
      user,
    );
    const evaluations = await this.em.find(
      AiAgentEvaluationItem,
      { agent: { handle: agent.handle } },
      {
        populate: ['agent', 'agentVersion'],
        orderBy: { updatedAt: 'DESC' },
      },
    );

    return evaluations.map((evaluation) => sanitizeAgentEvaluation(evaluation));
  }

  async createAgentEvaluation(
    agentHandle: string,
    dto: CreateAiAgentEvaluationDto,
    user: PersonItem,
  ): Promise<AiAgentEvaluationItem> {
    const agent = await this.agentPolicy.requireAccessibleAgent(
      agentHandle,
      user,
    );
    const version = await this.resolveAgentVersionForChat(
      agent,
      dto.agentVersionHandle,
      null,
    );
    const evaluation = this.em.create(AiAgentEvaluationItem, {
      agent,
      agentVersion: version,
      title: dto.title.trim(),
      prompt: dto.prompt.trim(),
      expectedCriteria: dto.expectedCriteria?.trim() || null,
      targetEntityHandle: dto.targetEntityHandle?.trim() || null,
      targetRecordHandle: dto.targetRecordHandle?.trim() || null,
      status: 'needsReview',
    });

    this.em.persist(evaluation);
    await this.em.flush();
    return sanitizeAgentEvaluation(evaluation);
  }

  async createAgentTestRun(
    agentHandle: string,
    dto: CreateAiAgentTestRunDto,
    user: PersonItem,
  ): Promise<AiAgentRunItem> {
    const session = await this.createManagedChatSession(
      {
        title: `Test: ${this.buildSessionTitle(dto.prompt)}`,
        agentHandle,
        agentVersionHandle: dto.agentVersionHandle,
        playbookHandle: dto.playbookHandle,
        contextEntityHandle: dto.contextEntityHandle,
        contextRecordHandle: dto.contextRecordHandle,
      },
      user,
    );

    const result = await this.streamChatMessage(
      {
        sessionHandle: session.handle,
        content: dto.prompt,
        agentHandle,
        agentVersionHandle: dto.agentVersionHandle,
        playbookHandle: dto.playbookHandle,
        contextEntityHandle: dto.contextEntityHandle,
        contextRecordHandle: dto.contextRecordHandle,
        contextPayload: { mode: 'agent-test-run' },
      },
      user,
      async () => undefined,
    );

    const run = await this.em.findOne(
      AiAgentRunItem,
      { message: { handle: result.assistantMessage.handle } },
      { populate: ['agent', 'agentVersion', 'playbook', 'person'] },
    );

    if (!run) {
      throw new NotFoundException('ai.agentRunNotFound');
    }

    return sanitizeAgentRun(run);
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
            agentVersionHandle: dto.agentVersionHandle,
            playbookHandle: dto.playbookHandle,
            contextEntityHandle: dto.contextEntityHandle,
            contextRecordHandle: dto.contextRecordHandle,
          },
          user,
        );

    const nextSequence = await this.getNextSequence(session.handle ?? 0);
    const runtimeContext = await this.resolveAgentRuntimeContext(
      dto.agentHandle,
      dto.agentVersionHandle,
      dto.playbookHandle,
      dto.contextEntityHandle ?? session.contextEntityHandle ?? null,
      dto.contextRecordHandle ?? session.contextRecordHandle ?? null,
      session,
      user,
    );
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ??
        extractProviderHandle(runtimeContext.version?.provider) ??
        extractProviderHandle(runtimeContext.agent?.provider) ??
        extractProviderHandle(session.provider),
      dto.modelHandle ??
        extractModelHandle(runtimeContext.version?.model) ??
        extractModelHandle(runtimeContext.agent?.model) ??
        extractModelHandle(session.model),
    );
    const availableTools = await this.mcpService.listActiveTools(
      user,
      runtimeContext.toolPolicy,
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
        contextPayload: {
          ...(dto.contextPayload ?? {}),
          contextEntityHandle:
            dto.contextEntityHandle ?? session.contextEntityHandle ?? null,
          contextRecordHandle:
            dto.contextRecordHandle ?? session.contextRecordHandle ?? null,
          playbookHandle: runtimeContext.playbook?.handle ?? null,
          agentVersionHandle: runtimeContext.version?.handle ?? null,
        },
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
    session.agent = runtimeContext.agent;
    session.agentVersion = runtimeContext.version;
    session.playbook = runtimeContext.playbook;
    session.contextEntityHandle =
      dto.contextEntityHandle ?? session.contextEntityHandle ?? null;
    session.contextRecordHandle =
      dto.contextRecordHandle ?? session.contextRecordHandle ?? null;
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

    const run = await this.createAgentRun({
      session,
      message: assistantMessage,
      person,
      agent: runtimeContext.agent,
      version: runtimeContext.version,
      playbook: runtimeContext.playbook,
      provider: runtimeTarget.provider.handle,
      model: runtimeTarget.model.providerModel,
      contextEntityHandle: session.contextEntityHandle ?? null,
      contextRecordHandle: session.contextRecordHandle ?? null,
    });

    const inlineToolExecution =
      await this.mcpService.tryExecuteInlineToolCommand(
        dto.content,
        user,
        runtimeContext.toolPolicy,
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
        agentRun: sanitizeAgentRun(run),
      };
      await this.completeAgentRun(run, {
        status: 'completed',
        responseText: assistantMessage.content,
        toolCalls: assistantMessage.toolCalls as Record<string, unknown>[],
        sources: navigationLinks,
        pendingActions: [],
      });
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
          runtimeContext.instruction,
          (entry, args) =>
            this.executePolicyAwareToolCall(
              entry,
              args,
              user,
              person,
              session,
              assistantMessage,
              runtimeContext.agent,
              runtimeContext.toolPolicy,
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
          runtimeContext.instruction,
          (entry, args) =>
            this.executePolicyAwareToolCall(
              entry,
              args,
              user,
              person,
              session,
              assistantMessage,
              runtimeContext.agent,
              runtimeContext.toolPolicy,
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
        agentRun: sanitizeAgentRun(run),
        agentVersion: runtimeContext.version
          ? sanitizeAgentVersion(runtimeContext.version)
          : null,
        playbook: runtimeContext.playbook
          ? sanitizeAgentPlaybook(runtimeContext.playbook)
          : null,
        sources: navigationLinks,
      };
      await this.completeAgentRun(run, {
        status: 'completed',
        responseText: assistantMessage.content,
        toolCalls: assistantMessage.toolCalls as Record<string, unknown>[],
        sources: navigationLinks,
        pendingActions: pendingToolActions.map((action) =>
          sanitizeToolAction(action),
        ) as unknown as Record<string, unknown>[],
        usagePayload: {
          provider: runtimeTarget.provider.handle,
          model: runtimeTarget.model.providerModel,
        },
      });
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
        agentRun: sanitizeAgentRun(run),
      };
      await this.completeAgentRun(run, {
        status: 'failed',
        errorPayload: {
          error: error instanceof Error ? error.message : 'ai.unknownError',
        },
      });
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
          'agentVersion',
          'agentVersion.provider',
          'agentVersion.model',
          'agentVersion.model.provider',
          'playbook',
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
    const agentVersion = await this.resolveAgentVersionForChat(
      agent,
      dto.agentVersionHandle,
      null,
    );
    const playbook = await this.resolveAgentPlaybookForChat(
      agent,
      dto.playbookHandle,
      null,
    );
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ??
        extractProviderHandle(agentVersion?.provider) ??
        extractProviderHandle(agent?.provider) ??
        null,
      dto.modelHandle ??
        extractModelHandle(agentVersion?.model) ??
        extractModelHandle(agent?.model) ??
        null,
    );

    const session = this.em.create(AiChatSessionItem, {
      title: dto.title?.trim() || 'New Chat',
      isArchived: false,
      provider: runtimeTarget.provider,
      model: runtimeTarget.model,
      agent,
      agentVersion,
      playbook,
      contextEntityHandle: dto.contextEntityHandle?.trim() || null,
      contextRecordHandle:
        dto.contextRecordHandle != null
          ? String(dto.contextRecordHandle).trim() || null
          : null,
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
      session.agentVersion = await this.resolveAgentVersionForChat(
        agent,
        dto.agentVersionHandle,
        session.agentVersion,
      );
      session.playbook = await this.resolveAgentPlaybookForChat(
        agent,
        dto.playbookHandle,
        session.playbook,
      );
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

    if (dto.agentVersionHandle !== undefined && dto.agentHandle === undefined) {
      session.agentVersion = await this.resolveAgentVersionForChat(
        session.agent && typeof session.agent !== 'string'
          ? session.agent
          : null,
        dto.agentVersionHandle,
        session.agentVersion,
      );
    }

    if (dto.playbookHandle !== undefined && dto.agentHandle === undefined) {
      session.playbook = await this.resolveAgentPlaybookForChat(
        session.agent && typeof session.agent !== 'string'
          ? session.agent
          : null,
        dto.playbookHandle,
        session.playbook,
      );
    }

    if (dto.contextEntityHandle !== undefined) {
      session.contextEntityHandle = dto.contextEntityHandle?.trim() || null;
    }

    if (dto.contextRecordHandle !== undefined) {
      session.contextRecordHandle =
        dto.contextRecordHandle != null
          ? String(dto.contextRecordHandle).trim() || null
          : null;
    }

    await this.em.flush();
    await this.populateChatSession(session);
    return sanitizeChatSession(session);
  }

  async applyChatSessionPlaybook(
    handle: number,
    dto: ApplyAiChatSessionPlaybookDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const session = await this.findOwnedSession(handle, user);
    session.playbook = await this.resolveAgentPlaybookForChat(
      session.agent && typeof session.agent !== 'string' ? session.agent : null,
      dto.playbookHandle,
      session.playbook,
    );
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
            agentVersionHandle: dto.agentVersionHandle,
            playbookHandle: dto.playbookHandle,
            contextEntityHandle: dto.contextEntityHandle,
            contextRecordHandle: dto.contextRecordHandle,
          },
          user,
        );

    const runtimeContext = await this.resolveAgentRuntimeContext(
      dto.agentHandle,
      dto.agentVersionHandle,
      dto.playbookHandle,
      dto.contextEntityHandle ?? session.contextEntityHandle ?? null,
      dto.contextRecordHandle ?? session.contextRecordHandle ?? null,
      session,
      user,
    );
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ??
        extractProviderHandle(runtimeContext.version?.provider) ??
        extractProviderHandle(runtimeContext.agent?.provider) ??
        extractProviderHandle(session.provider),
      dto.modelHandle ??
        extractModelHandle(runtimeContext.version?.model) ??
        extractModelHandle(runtimeContext.agent?.model) ??
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
    session.agent = runtimeContext.agent;
    session.agentVersion = runtimeContext.version;
    session.playbook = runtimeContext.playbook;
    session.contextEntityHandle =
      dto.contextEntityHandle ?? session.contextEntityHandle ?? null;
    session.contextRecordHandle =
      dto.contextRecordHandle ?? session.contextRecordHandle ?? null;
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

  private async resolveAgentRuntimeContext(
    requestedAgentHandle: string | null | undefined,
    requestedVersionHandle: number | null | undefined,
    requestedPlaybookHandle: string | null | undefined,
    contextEntityHandle: string | null | undefined,
    contextRecordHandle: string | number | null | undefined,
    session: AiChatSessionItem,
    user: PersonItem,
  ): Promise<AgentRuntimeContext> {
    const agent = await this.agentPolicy.resolveAgentForChat(
      requestedAgentHandle,
      session.agent,
      user,
    );
    const version = await this.resolveAgentVersionForChat(
      agent,
      requestedVersionHandle,
      session.agentVersion,
    );
    const playbook = await this.resolveAgentPlaybookForChat(
      agent,
      requestedPlaybookHandle,
      session.playbook,
    );
    const memories = agent
      ? await this.loadAccessibleMemories(
          agent,
          user,
          contextEntityHandle?.trim() || null,
        )
      : [];
    const toolPolicy = this.buildVersionedToolPolicy(agent, version);
    const contextInstruction = await this.buildContextInstruction(
      contextEntityHandle,
      contextRecordHandle,
      user,
      toolPolicy,
    );

    return {
      agent,
      version,
      playbook,
      memories,
      toolPolicy,
      instruction: this.buildRuntimeInstruction(
        agent,
        version,
        playbook,
        memories,
        contextInstruction,
      ),
    };
  }

  private async resolveAgentVersionForChat(
    agent: AiAgentItem | null,
    requestedVersionHandle: number | null | undefined,
    fallbackVersion: AiAgentVersionItem | number | null | undefined,
  ): Promise<AiAgentVersionItem | null> {
    if (!agent) {
      return null;
    }

    const fallbackHandle =
      typeof fallbackVersion === 'number'
        ? fallbackVersion
        : (fallbackVersion?.handle ?? null);
    const versionHandle = requestedVersionHandle ?? fallbackHandle;

    if (versionHandle != null) {
      const version = await this.em.findOne(
        AiAgentVersionItem,
        { handle: versionHandle, agent: { handle: agent.handle } },
        { populate: ['agent', 'provider', 'model', 'model.provider'] },
      );

      if (!version) {
        throw new NotFoundException('ai.agentVersionNotFound');
      }

      return version;
    }

    const activeVersion = await this.em.findOne(
      AiAgentVersionItem,
      { agent: { handle: agent.handle }, status: 'active' },
      {
        populate: ['agent', 'provider', 'model', 'model.provider'],
        orderBy: { version: 'DESC' },
      },
    );

    if (activeVersion) {
      return activeVersion;
    }

    const latestVersion = await this.em.findOne(
      AiAgentVersionItem,
      { agent: { handle: agent.handle } },
      {
        populate: ['agent', 'provider', 'model', 'model.provider'],
        orderBy: { version: 'DESC' },
      },
    );

    return latestVersion ?? null;
  }

  private async resolveAgentPlaybookForChat(
    agent: AiAgentItem | null,
    requestedPlaybookHandle: string | null | undefined,
    fallbackPlaybook: AiAgentPlaybookItem | string | null | undefined,
  ): Promise<AiAgentPlaybookItem | null> {
    if (!agent) {
      return null;
    }

    const fallbackHandle =
      typeof fallbackPlaybook === 'string'
        ? fallbackPlaybook
        : (fallbackPlaybook?.handle ?? null);
    const playbookHandle = requestedPlaybookHandle ?? fallbackHandle;

    if (!playbookHandle) {
      return null;
    }

    const playbook = await this.em.findOne(
      AiAgentPlaybookItem,
      {
        handle: playbookHandle,
        agent: { handle: agent.handle },
        isActive: true,
      },
      { populate: ['agent'] },
    );

    if (!playbook) {
      throw new NotFoundException('ai.agentPlaybookNotFound');
    }

    return playbook;
  }

  private buildVersionedToolPolicy(
    agent: AiAgentItem | null,
    version: AiAgentVersionItem | null,
  ): McpToolPolicy | undefined {
    const basePolicy = this.agentPolicy.buildToolPolicy(agent);

    if (!basePolicy || !version) {
      return basePolicy;
    }

    return {
      ...basePolicy,
      allowedEntityHandles:
        this.normalizeStringArray(version.allowedEntityHandles).length > 0
          ? this.normalizeStringArray(version.allowedEntityHandles)
          : basePolicy.allowedEntityHandles,
      allowedKnowledgeEntityHandles:
        this.normalizeStringArray(version.allowedKnowledgeEntityHandles)
          .length > 0
          ? this.normalizeStringArray(version.allowedKnowledgeEntityHandles)
          : basePolicy.allowedKnowledgeEntityHandles,
      allowedInternalTools:
        this.normalizeStringArray(version.allowedInternalTools).length > 0
          ? this.normalizeStringArray(version.allowedInternalTools)
          : basePolicy.allowedInternalTools,
      allowedExternalTools:
        this.normalizeStringArray(version.allowedExternalTools).length > 0
          ? this.normalizeStringArray(version.allowedExternalTools)
          : basePolicy.allowedExternalTools,
      blockMutatingTools: true,
    };
  }

  private buildRuntimeInstruction(
    agent: AiAgentItem | null,
    version: AiAgentVersionItem | null,
    playbook: AiAgentPlaybookItem | null,
    memories: AiAgentMemoryItem[],
    contextInstruction: string | null,
  ): string | null {
    if (!agent) {
      return contextInstruction;
    }

    const promptMarkdown = version?.promptMarkdown?.trim()
      ? version.promptMarkdown.trim()
      : agent.promptMarkdown?.trim();
    const lines = [
      `You are currently acting as the Sapling AI agent "${agent.title}".`,
      agent.description?.trim()
        ? `Agent description: ${agent.description.trim()}`
        : null,
      version
        ? `Agent version: v${version.version} (${version.status}).`
        : null,
      promptMarkdown || null,
      this.buildRuntimeScopeInstruction(agent, version),
      playbook ? this.buildPlaybookInstruction(playbook) : null,
      memories.length > 0 ? this.buildMemoryInstruction(memories) : null,
      contextInstruction,
      agent.mutationMode === 'readOnly'
        ? 'This agent is read-only. Do not create, update, or delete Sapling records.'
        : 'For create, update, or delete operations, prepare the action and wait for explicit user confirmation in Sapling.',
    ].filter((line): line is string => !!line);

    return lines.join('\n\n');
  }

  private buildRuntimeScopeInstruction(
    agent: AiAgentItem,
    version: AiAgentVersionItem | null,
  ): string | null {
    const entityHandles =
      this.normalizeStringArray(version?.allowedEntityHandles).length > 0
        ? this.normalizeStringArray(version?.allowedEntityHandles)
        : this.normalizeStringArray(agent.allowedEntityHandles);
    const knowledgeHandles =
      this.normalizeStringArray(version?.allowedKnowledgeEntityHandles).length >
      0
        ? this.normalizeStringArray(version?.allowedKnowledgeEntityHandles)
        : this.normalizeStringArray(agent.allowedKnowledgeEntityHandles);

    if (entityHandles.length === 0 && knowledgeHandles.length === 0) {
      return null;
    }

    return [
      entityHandles.length > 0
        ? `Allowed Sapling entities: ${entityHandles.join(', ')}.`
        : null,
      knowledgeHandles.length > 0
        ? `Allowed knowledge search sources: ${knowledgeHandles.join(', ')}.`
        : null,
    ]
      .filter((line): line is string => !!line)
      .join(' ');
  }

  private buildPlaybookInstruction(playbook: AiAgentPlaybookItem): string {
    const steps = (playbook.steps ?? [])
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n');

    return [
      `Selected playbook: ${playbook.title}.`,
      playbook.description?.trim()
        ? `Playbook description: ${playbook.description.trim()}`
        : null,
      steps ? `Follow these steps:\n${steps}` : null,
      playbook.expectedOutput?.trim()
        ? `Expected output: ${playbook.expectedOutput.trim()}`
        : null,
    ]
      .filter((line): line is string => !!line)
      .join('\n\n');
  }

  private buildMemoryInstruction(memories: AiAgentMemoryItem[]): string {
    const memoryLines = memories.map(
      (memory) =>
        `- [${memory.type}] ${memory.title}: ${memory.contentMarkdown.trim()}`,
    );

    return `Relevant admin-managed agent memory:\n${memoryLines.join('\n')}`;
  }

  private async buildContextInstruction(
    contextEntityHandle: string | null | undefined,
    contextRecordHandle: string | number | null | undefined,
    user: PersonItem,
    policy: McpToolPolicy | undefined,
  ): Promise<string | null> {
    const entityHandle = contextEntityHandle?.trim();
    const recordHandle =
      contextRecordHandle != null ? String(contextRecordHandle).trim() : '';

    if (!entityHandle || !recordHandle) {
      return null;
    }

    try {
      const result = await this.mcpService.executeTool(
        'sapling',
        'generic_get',
        {
          entityHandle,
          handle: Number.isFinite(Number(recordHandle))
            ? Number(recordHandle)
            : recordHandle,
        },
        user,
        policy,
      );

      return `Current record context (${entityHandle} ${recordHandle}):\n${JSON.stringify(
        result.modelResult ?? result.rawResult,
        null,
        2,
      )}`;
    } catch (error) {
      return `Current record context was requested for ${entityHandle} ${recordHandle}, but Sapling could not load it with the current user's permissions. Error: ${
        error instanceof Error ? error.message : 'unknown'
      }`;
    }
  }

  private async loadAccessibleMemories(
    agent: AiAgentItem,
    user: PersonItem,
    contextEntityHandle?: string | null,
  ): Promise<AiAgentMemoryItem[]> {
    const userRoleHandles = await this.getUserRoleHandles(user);
    const memories = await this.em.find(
      AiAgentMemoryItem,
      { agent: { handle: agent.handle }, isActive: true },
      {
        populate: ['agent', 'roles'],
        orderBy: { sortOrder: 'ASC', title: 'ASC' },
      },
    );

    return memories.filter((memory) => {
      const memoryRoles = memory.roles.getItems();
      const roleMatches =
        memoryRoles.length === 0 ||
        memoryRoles.some(
          (role) => role.handle != null && userRoleHandles.has(role.handle),
        );
      const entityScopes = this.normalizeStringArray(memory.entityScopeHandles);
      const entityMatches =
        entityScopes.length === 0 ||
        (contextEntityHandle != null &&
          entityScopes.includes(contextEntityHandle));

      return roleMatches && entityMatches;
    });
  }

  private async getUserRoleHandles(user: PersonItem): Promise<Set<number>> {
    const person = await this.em.findOne(
      PersonItem,
      { handle: this.requireUserHandle(user) },
      { populate: ['roles'] },
    );

    if (!person) {
      throw new NotFoundException('auth.userNotFound');
    }

    return new Set(
      person.roles
        .getItems()
        .map((role) => role.handle)
        .filter((handle): handle is number => typeof handle === 'number'),
    );
  }

  private async createAgentRun(input: {
    session: AiChatSessionItem;
    message: AiChatMessageItem;
    person: PersonItem;
    agent: AiAgentItem | null;
    version: AiAgentVersionItem | null;
    playbook: AiAgentPlaybookItem | null;
    provider: string;
    model: string;
    contextEntityHandle: string | null;
    contextRecordHandle: string | null;
  }): Promise<AiAgentRunItem> {
    const run = this.em.create(AiAgentRunItem, {
      session: input.session,
      message: input.message,
      person: input.person,
      agent: input.agent,
      agentVersion: input.version,
      playbook: input.playbook,
      status: 'running',
      provider: input.provider,
      model: input.model,
      contextEntityHandle: input.contextEntityHandle,
      contextRecordHandle: input.contextRecordHandle,
      startedAt: new Date(),
    });

    this.em.persist(run);
    await this.em.flush();
    return run;
  }

  private async completeAgentRun(
    run: AiAgentRunItem,
    patch: {
      status: string;
      responseText?: string | null;
      toolCalls?: Record<string, unknown>[] | null;
      sources?: Record<string, unknown>[] | null;
      pendingActions?: Record<string, unknown>[] | null;
      usagePayload?: Record<string, unknown> | null;
      errorPayload?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    const completedAt = new Date();
    run.status = patch.status;
    run.completedAt = completedAt;
    run.durationMs = Math.max(
      0,
      completedAt.getTime() -
        (run.startedAt?.getTime() ?? completedAt.getTime()),
    );
    run.responseText = patch.responseText ?? run.responseText ?? null;
    run.toolCalls = patch.toolCalls ?? run.toolCalls ?? null;
    run.sources = patch.sources ?? run.sources ?? null;
    run.pendingActions = patch.pendingActions ?? run.pendingActions ?? null;
    run.usagePayload = patch.usagePayload ?? run.usagePayload ?? null;
    run.errorPayload = patch.errorPayload ?? run.errorPayload ?? null;
  }

  private buildAgentWorkbenchStats(
    runs: AiAgentRunItem[],
    evaluations: AiAgentEvaluationItem[],
  ): Record<string, unknown> {
    const evaluationTotal = evaluations.length;
    const evaluationPassed = evaluations.filter(
      (evaluation) => evaluation.status === 'passed',
    ).length;

    return {
      runsTotal: runs.length,
      failedRuns: runs.filter((run) => run.status === 'failed').length,
      pendingActions: runs.reduce(
        (total, run) => total + (run.pendingActions?.length ?? 0),
        0,
      ),
      evaluationTotal,
      evaluationPassed,
      evaluationPassRate:
        evaluationTotal > 0
          ? Math.round((evaluationPassed / evaluationTotal) * 100)
          : null,
    };
  }

  private normalizeStringArray(value: string[] | null | undefined): string[] {
    return (value ?? []).map((item) => item.trim()).filter(Boolean);
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
          'agentVersion',
          'agentVersion.provider',
          'agentVersion.model',
          'agentVersion.model.provider',
          'playbook',
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
      'agentVersion',
      'agentVersion.provider',
      'agentVersion.model',
      'agentVersion.model.provider',
      'playbook',
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
