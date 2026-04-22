import { EntityManager } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { OpenAI } from 'openai';
import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Part,
} from '@google/generative-ai';
import { PersonItem } from '../../entity/PersonItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import {
  CreateAiChatMessageDto,
  CreateAiChatSessionDto,
  UpdateAiChatSessionDto,
} from './dto/chat.dto';
import { McpService, type McpToolDescriptor } from './mcp.service';

type AiExecutedToolCall = {
  serverHandle: number;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  rawResult: unknown;
};

type AiToolErrorPayload = {
  ok: false;
  toolName?: string;
  error?: string;
  hints?: string[];
};

type AiChatNavigationLink = {
  path: string;
  entityHandle: string;
  kind: 'list' | 'record';
};

type AiStreamResult = {
  toolCalls: AiExecutedToolCall[];
};

type AiToolRegistryEntry = {
  encodedName: string;
  descriptor: McpToolDescriptor;
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
    private readonly mcpService: McpService,
  ) {}

  /**
   * Returns an answer to a question using the configured AI provider.
   * @param question The question to ask
   * @returns Answer as a string
   */
  async ask(question: string): Promise<string> {
    const runtimeTarget = await this.resolveRuntimeTarget();

    if (runtimeTarget.providerKind === 'openai') {
      const response = await this.createOpenAiClient(
        runtimeTarget.provider,
      ).chat.completions.create({
        model: runtimeTarget.model.providerModel,
        messages: [
          {
            role: 'system',
            content: this.buildSystemInstruction({ includeToolGuidance: true }),
          },
          { role: 'user', content: question },
        ],
      });
      return response.choices[0]?.message?.content || '';
    } else if (runtimeTarget.providerKind === 'gemini') {
      const generativeModel = this.createGeminiClient(
        runtimeTarget.provider,
      ).getGenerativeModel({
        model: runtimeTarget.model.providerModel,
        systemInstruction: this.buildSystemInstruction({
          includeToolGuidance: true,
        }),
      });
      const result = await generativeModel.generateContent(question);
      return result.response.text();
    }
    throw new Error('ai.providerNotConfigured');
  }

  /**
   * Creates a new entity (example logic, extendable).
   * @param entityType Type of the entity
   * @param data Data for the entity
   * @returns Created entity object
   */
  createEntity(
    entityType: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    // Logic for entity creation, e.g., DB call or service
    // Extendable for all entities
    return { entityType, ...data, created: true };
  }

  async listActiveProviders(): Promise<AiProviderTypeItem[]> {
    const providers = await this.em.find(
      AiProviderTypeItem,
      { isActive: true },
      {
        orderBy: {
          title: 'ASC',
        },
      },
    );

    return providers.map((provider) => this.sanitizeProvider(provider));
  }

  async listActiveModels(
    providerHandle?: string,
  ): Promise<AiProviderModelItem[]> {
    const models = await this.em.find(
      AiProviderModelItem,
      {
        isActive: true,
        ...(providerHandle?.trim()
          ? { provider: { handle: providerHandle.trim() } }
          : {}),
      },
      {
        populate: ['provider'],
        orderBy: {
          provider: { title: 'ASC' },
          isDefault: 'DESC',
          sortOrder: 'ASC',
          title: 'ASC',
        },
      },
    );

    return models.map((model) => this.sanitizeModel(model));
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
          },
          user,
        );

    const nextSequence = await this.getNextSequence(session.handle ?? 0);
    const runtimeTarget = await this.resolveRuntimeTarget(
      dto.providerHandle ?? this.extractProviderHandle(session.provider),
      dto.modelHandle ?? this.extractModelHandle(session.model),
    );
    const availableTools = await this.mcpService.listActiveTools(user);

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
    session.lastMessageAt = new Date();
    this.em.persist([userMessage, assistantMessage]);
    await this.em.flush();
    await this.populateChatSession(session);

    await onEvent({
      type: 'session.upsert',
      session: this.sanitizeChatSession(session),
    });
    await onEvent({
      type: 'message.user',
      message: this.sanitizeChatMessage(userMessage),
    });
    await onEvent({
      type: 'message.assistant',
      message: this.sanitizeChatMessage(assistantMessage),
    });
    await onEvent({ type: 'mcp.tools', tools: availableTools });

    const inlineToolExecution =
      await this.mcpService.tryExecuteInlineToolCommand(dto.content, user);

    if (inlineToolExecution) {
      const navigationLinks = this.buildNavigationLinks([
        {
          serverHandle: inlineToolExecution.serverHandle,
          serverName: inlineToolExecution.serverName,
          toolName: inlineToolExecution.toolName,
          arguments: inlineToolExecution.arguments,
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
        message: this.sanitizeChatMessage(assistantMessage),
        session: this.sanitizeChatSession(session),
      });
      return { session, userMessage, assistantMessage };
    }

    try {
      const history = await this.loadSessionHistory(session.handle ?? 0);

      let streamResult: AiStreamResult;
      const maxToolCallIterations = this.resolveMaxToolCallIterations(
        runtimeTarget.model,
      );

      if (runtimeTarget.providerKind === 'openai') {
        streamResult = await this.streamOpenAi(
          history,
          runtimeTarget.provider,
          runtimeTarget.model.providerModel,
          availableTools,
          user,
          maxToolCallIterations,
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
        );
      } else {
        streamResult = await this.streamGemini(
          history,
          runtimeTarget.provider,
          runtimeTarget.model.providerModel,
          availableTools,
          user,
          maxToolCallIterations,
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
        );
      }

      assistantMessage.toolCalls = streamResult.toolCalls.map((toolCall) => ({
        serverHandle: toolCall.serverHandle,
        serverName: toolCall.serverName,
        toolName: toolCall.toolName,
        arguments: toolCall.arguments,
      }));

      assistantMessage.status = 'completed';
      const navigationLinks = this.buildNavigationLinks(streamResult.toolCalls);
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
      };
      await this.em.flush();

      await onEvent({
        type: 'message.completed',
        message: this.sanitizeChatMessage(assistantMessage),
        session: this.sanitizeChatSession(session),
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
        populate: ['provider', 'model', 'model.provider'],
        orderBy: { updatedAt: 'DESC' },
      },
    );

    return sessions.map((session) => this.sanitizeChatSession(session));
  }

  async createChatSession(
    dto: CreateAiChatSessionDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const session = await this.createManagedChatSession(dto, user);
    return this.sanitizeChatSession(session);
  }

  private async createManagedChatSession(
    dto: CreateAiChatSessionDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const person = await this.requireManagedUser(user);
    const runtimeTarget = await this.resolveRuntimeTarget(
      dto.providerHandle ?? null,
      dto.modelHandle ?? null,
    );

    const session = this.em.create(AiChatSessionItem, {
      title: dto.title?.trim() || 'New Chat',
      isArchived: false,
      provider: runtimeTarget.provider,
      model: runtimeTarget.model,
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
      const runtimeTarget = await this.resolveRuntimeTarget(
        dto.providerHandle ?? this.extractProviderHandle(session.provider),
        dto.modelHandle ?? this.extractModelHandle(session.model),
      );
      session.provider = runtimeTarget.provider;
      session.model = runtimeTarget.model;
    }

    await this.em.flush();
    await this.populateChatSession(session);
    return this.sanitizeChatSession(session);
  }

  async listChatMessages(
    sessionHandle: number,
    user: PersonItem,
  ): Promise<AiChatMessageItem[]> {
    const userHandle = this.requireUserHandle(user);
    await this.findOwnedSession(sessionHandle, user);

    return this.em
      .find(
        AiChatMessageItem,
        { session: { handle: sessionHandle }, person: { handle: userHandle } },
        { orderBy: { sequence: 'ASC' } },
      )
      .then((messages) =>
        messages.map((message) => this.sanitizeChatMessage(message)),
      );
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
          },
          user,
        );

    const runtimeTarget = await this.resolveRuntimeTarget(
      dto.providerHandle ?? this.extractProviderHandle(session.provider),
      dto.modelHandle ?? this.extractModelHandle(session.model),
    );

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
        contextPayload: dto.contextPayload ?? null,
      },
    });

    session.lastMessageAt = new Date();
    session.provider = runtimeTarget.provider;
    session.model = runtimeTarget.model;
    if (!session.title?.trim()) {
      session.title = this.buildSessionTitle(dto.content);
    }

    this.em.persist(message);
    await this.em.flush();
    await this.populateChatSession(session);
    return {
      session: this.sanitizeChatSession(session),
      message: this.sanitizeChatMessage(message),
    };
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
      { populate: ['provider', 'model', 'model.provider'] },
    );

    if (!session) {
      throw new NotFoundException('global.notFound');
    }

    return session;
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

  private resolveProvider(
    preferredProvider?: string | null,
  ): 'openai' | 'gemini' {
    return preferredProvider === 'gemini' ? 'gemini' : 'openai';
  }

  private async resolveRuntimeTarget(
    preferredProviderHandle?: string | null,
    preferredModelHandle?: string | null,
  ): Promise<{
    provider: AiProviderTypeItem;
    model: AiProviderModelItem;
    providerKind: 'openai' | 'gemini';
  }> {
    const model = preferredModelHandle?.trim()
      ? await this.findModelByHandle(preferredModelHandle.trim())
      : preferredProviderHandle?.trim()
        ? await this.findDefaultModelForProvider(preferredProviderHandle.trim())
        : await this.getDefaultModelConfig();

    if (!model) {
      throw new NotFoundException('ai.modelNotFound');
    }

    await this.em.populate(model, ['provider']);
    const provider = model.provider;

    if (!this.hasUsableProviderCredentials(provider)) {
      throw new Error('ai.providerNotConfigured');
    }

    return {
      provider,
      model,
      providerKind: this.resolveProvider(provider.handle),
    };
  }

  private resolveModel(
    provider: 'openai' | 'gemini',
    preferredModel?: string | null,
  ): string {
    return (
      preferredModel?.trim() ||
      (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4.1-mini')
    );
  }

  private async getDefaultModelConfig(): Promise<AiProviderModelItem | null> {
    const models = await this.em.find(
      AiProviderModelItem,
      { isActive: true },
      {
        populate: ['provider'],
        orderBy: {
          isDefault: 'DESC',
          sortOrder: 'ASC',
          title: 'ASC',
        },
        limit: 1,
      },
    );

    return (
      models.find((model) =>
        this.hasUsableProviderCredentials(model.provider as AiProviderTypeItem),
      ) ?? null
    );
  }

  private async findDefaultModelForProvider(
    providerHandle: string,
  ): Promise<AiProviderModelItem | null> {
    const models = await this.em.find(
      AiProviderModelItem,
      {
        isActive: true,
        provider: { handle: providerHandle },
      },
      {
        populate: ['provider'],
        orderBy: {
          isDefault: 'DESC',
          sortOrder: 'ASC',
          title: 'ASC',
        },
        limit: 1,
      },
    );

    return models[0] ?? null;
  }

  private async findModelByHandle(
    handle: string,
  ): Promise<AiProviderModelItem | null> {
    return this.em.findOne(
      AiProviderModelItem,
      { handle, isActive: true },
      { populate: ['provider'] },
    );
  }

  private extractProviderHandle(
    provider?: AiProviderTypeItem | string | null,
  ): string | null {
    if (!provider) {
      return null;
    }

    if (typeof provider === 'string') {
      return provider;
    }

    return provider.handle ?? null;
  }

  private extractModelHandle(
    model?: AiProviderModelItem | string | null,
  ): string | null {
    if (!model) {
      return null;
    }

    if (typeof model === 'string') {
      return model;
    }

    return model.handle ?? null;
  }

  private async populateChatSession(session: AiChatSessionItem): Promise<void> {
    await this.em.populate(session, ['provider', 'model', 'model.provider']);
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
  ): Promise<AiChatMessageItem[]> {
    return this.em.find(
      AiChatMessageItem,
      { session: { handle: sessionHandle } },
      { orderBy: { sequence: 'ASC' } },
    );
  }

  private async streamOpenAi(
    history: AiChatMessageItem[],
    provider: AiProviderTypeItem,
    model: string,
    availableTools: McpToolDescriptor[],
    user: PersonItem,
    maxToolCallIterations: number,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const toolRegistry = this.buildToolRegistry(availableTools);
    const messages = this.buildOpenAiMessages(history);
    const executedToolCalls: AiExecutedToolCall[] = [];

    for (let iteration = 0; iteration < maxToolCallIterations; iteration += 1) {
      const response = await this.createOpenAiClient(
        provider,
      ).chat.completions.create({
        model,
        messages: messages as never,
        ...(toolRegistry.length > 0
          ? {
              tools: this.buildOpenAiTools(toolRegistry),
              tool_choice: 'auto' as const,
            }
          : {}),
      });

      const assistantMessage = response.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error('ai.emptyResponse');
      }

      const toolCalls = assistantMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const content = assistantMessage.content ?? '';
        await onDelta(content);
        return { toolCalls: executedToolCalls };
      }

      messages.push({
        role: 'assistant',
        content: assistantMessage.content ?? '',
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
          continue;
        }

        const args = this.parseToolArguments(toolCall.function.arguments);
        const toolExecution = await this.executeAutomaticToolCall(
          toolRegistry,
          toolCall.function.name,
          args,
          user,
        );

        executedToolCalls.push({
          serverHandle: toolExecution.serverHandle,
          serverName: toolExecution.serverName,
          toolName: toolExecution.toolName,
          arguments: args,
          rawResult: toolExecution.rawResult,
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolExecution.content,
        });
      }
    }

    throw new Error('ai.toolCallLimitExceeded');
  }

  private async streamGemini(
    history: AiChatMessageItem[],
    provider: AiProviderTypeItem,
    modelName: string,
    availableTools: McpToolDescriptor[],
    user: PersonItem,
    maxToolCallIterations: number,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const toolRegistry = this.buildToolRegistry(availableTools);
    const conversation = this.buildGeminiConversation(history);
    const currentTurn = conversation.pop();

    if (!currentTurn || currentTurn.role !== 'user') {
      throw new Error('ai.invalidHistory');
    }

    try {
      const functionDeclarations =
        this.buildGeminiFunctionDeclarations(toolRegistry);

      return await this.streamGeminiWithTools(
        provider,
        modelName,
        conversation,
        currentTurn.parts,
        toolRegistry,
        functionDeclarations,
        user,
        maxToolCallIterations,
        onDelta,
      );
    } catch (error) {
      this.logGeminiToolModeError(
        error,
        modelName,
        toolRegistry.map((entry) => entry.encodedName),
      );

      return this.streamGeminiWithoutTools(
        provider,
        modelName,
        conversation,
        currentTurn.parts,
        onDelta,
      );
    }
  }

  private async streamGeminiWithTools(
    provider: AiProviderTypeItem,
    modelName: string,
    conversation: Content[],
    currentTurnParts: Part[],
    toolRegistry: AiToolRegistryEntry[],
    functionDeclarations: FunctionDeclaration[],
    user: PersonItem,
    maxToolCallIterations: number,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const generativeModel = this.createGeminiClient(
      provider,
    ).getGenerativeModel({
      model: modelName,
      ...(functionDeclarations.length > 0
        ? {
            tools: [
              {
                functionDeclarations,
              },
            ],
          }
        : {}),
      systemInstruction: this.buildSystemInstruction({
        includeToolGuidance: true,
      }),
    });

    const chat = generativeModel.startChat({ history: conversation });
    const executedToolCalls: AiExecutedToolCall[] = [];
    const repeatedCallCounts = new Map<string, number>();
    let consecutiveToolErrorIterations = 0;
    let result = await chat.sendMessage(currentTurnParts);

    for (let iteration = 0; iteration < maxToolCallIterations; iteration += 1) {
      const functionCalls = result.response.functionCalls() ?? [];

      if (functionCalls.length === 0) {
        const content = result.response.text();
        await onDelta(content);
        return { toolCalls: executedToolCalls };
      }

      const functionResponses: Part[] = [];
      const toolErrors: AiToolErrorPayload[] = [];

      for (const functionCall of functionCalls) {
        const args = this.normalizeFunctionCallArgs(functionCall);
        const toolCallSignature = this.buildToolCallSignature(
          functionCall.name,
          args,
        );
        const repeatedCallCount =
          (repeatedCallCounts.get(toolCallSignature) ?? 0) + 1;

        repeatedCallCounts.set(toolCallSignature, repeatedCallCount);

        if (repeatedCallCount > 2) {
          await onDelta(
            'Ich breche die automatische Werkzeugschleife ab, weil derselbe Tool-Aufruf wiederholt fehlgeschlagen ist. Bitte formuliere die Frage konkreter oder prüfe zuerst das Entity-Schema.',
          );
          return { toolCalls: executedToolCalls };
        }

        const toolExecution = await this.executeAutomaticToolCall(
          toolRegistry,
          functionCall.name,
          args,
          user,
        );

        executedToolCalls.push({
          serverHandle: toolExecution.serverHandle,
          serverName: toolExecution.serverName,
          toolName: toolExecution.toolName,
          arguments: args,
          rawResult: toolExecution.rawResult,
        });

        if (this.isToolErrorPayload(toolExecution.rawResult)) {
          toolErrors.push(toolExecution.rawResult);
        }

        functionResponses.push({
          functionResponse: {
            name: functionCall.name,
            response: {
              content: toolExecution.rawResult,
            },
          },
        });
      }

      if (toolErrors.length === functionCalls.length) {
        consecutiveToolErrorIterations += 1;
      } else {
        consecutiveToolErrorIterations = 0;
      }

      if (consecutiveToolErrorIterations >= 2) {
        await onDelta(this.buildToolFailureAssistantMessage(toolErrors));
        return { toolCalls: executedToolCalls };
      }

      result = await chat.sendMessage(functionResponses);
    }

    await onDelta(
      'Ich habe die automatische Werkzeugausführung beendet, weil zu viele aufeinanderfolgende Tool-Aufrufe nötig waren. Bitte formuliere die Anfrage konkreter oder nenne die gewünschte Entity direkt.',
    );
    return { toolCalls: executedToolCalls };
  }

  private async streamGeminiWithoutTools(
    provider: AiProviderTypeItem,
    modelName: string,
    conversation: Content[],
    currentTurnParts: Part[],
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const generativeModel = this.createGeminiClient(
      provider,
    ).getGenerativeModel({
      model: modelName,
      systemInstruction: this.buildSystemInstruction(),
    });

    const chat = generativeModel.startChat({ history: conversation });
    const result = await chat.sendMessage(currentTurnParts);
    await onDelta(result.response.text());
    return { toolCalls: [] };
  }

  private logGeminiToolModeError(
    error: unknown,
    modelName: string,
    functionNames: string[],
  ): void {
    const errorMessage =
      error instanceof Error ? (error.stack ?? error.message) : String(error);

    global.log?.error?.(
      [
        `Gemini tool mode failed for model ${modelName}. Falling back to plain chat.`,
        `Functions: ${functionNames.join(', ')}`,
        errorMessage,
      ].join('\n'),
    );
  }

  private resolveMaxToolCallIterations(model: AiProviderModelItem): number {
    const value = model.maxToolCallIterations;

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 8;
    }

    return Math.max(1, Math.floor(value));
  }

  private isToolErrorPayload(value: unknown): value is AiToolErrorPayload {
    return (
      !!value &&
      typeof value === 'object' &&
      (value as { ok?: unknown }).ok === false
    );
  }

  private buildToolCallSignature(
    functionName: string,
    args: Record<string, unknown>,
  ): string {
    return `${functionName}:${this.stableStringify(args)}`;
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort((left, right) => left.localeCompare(right))
        .map(
          (key) =>
            `${JSON.stringify(key)}:${this.stableStringify(record[key])}`,
        )
        .join(',')}}`;
    }

    return JSON.stringify(value);
  }

  private buildNavigationLinks(
    toolCalls: AiExecutedToolCall[],
  ): AiChatNavigationLink[] {
    const deduplicatedLinks = new Map<string, AiChatNavigationLink>();

    for (const toolCall of toolCalls) {
      const link = this.buildNavigationLink(toolCall);

      if (!link) {
        continue;
      }

      deduplicatedLinks.set(link.path, link);
    }

    return [...deduplicatedLinks.values()];
  }

  private buildNavigationLink(
    toolCall: AiExecutedToolCall,
  ): AiChatNavigationLink | null {
    const entityHandle = this.asNonEmptyString(toolCall.arguments.entityHandle);

    if (!entityHandle) {
      return null;
    }

    if (toolCall.toolName === 'generic_list') {
      return {
        path: this.buildEntityTablePath(
          entityHandle,
          this.asRecord(toolCall.arguments.filter),
        ),
        entityHandle,
        kind: 'list',
      };
    }

    if (
      toolCall.toolName === 'generic_create' ||
      toolCall.toolName === 'generic_update'
    ) {
      const recordHandle = this.extractRecordHandle(
        toolCall.rawResult,
        toolCall.arguments.handle,
      );

      if (recordHandle == null) {
        return null;
      }

      return {
        path: this.buildEntityTablePath(entityHandle, { handle: recordHandle }),
        entityHandle,
        kind: 'record',
      };
    }

    return null;
  }

  private buildEntityTablePath(
    entityHandle: string,
    filter?: Record<string, unknown>,
  ): string {
    const hasFilter = !!filter && Object.keys(filter).length > 0;
    const query = hasFilter
      ? `?filter=${encodeURIComponent(JSON.stringify(filter))}`
      : '';

    return `/table/${entityHandle}${query}`;
  }

  private extractRecordHandle(
    rawResult: unknown,
    fallbackHandle?: unknown,
  ): string | number | null {
    const resultHandle = this.asHandleValue(
      rawResult && typeof rawResult === 'object'
        ? (rawResult as Record<string, unknown>).handle
        : null,
    );

    return resultHandle ?? this.asHandleValue(fallbackHandle);
  }

  private asHandleValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return null;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private asNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private buildToolFailureAssistantMessage(
    toolErrors: AiToolErrorPayload[],
  ): string {
    const firstError = toolErrors[0];
    const errorLine = firstError?.error
      ? `Das Datenwerkzeug hat wiederholt mit folgendem Fehler geantwortet: ${firstError.error}.`
      : 'Das Datenwerkzeug hat wiederholt ungültige Aufrufe erhalten.';
    const hintLine = firstError?.hints?.[0]
      ? `Hinweis: ${firstError.hints[0]}`
      : 'Hinweis: Prüfe zuerst das Entity-Schema und verwende nur dort aufgeführte Felder und Operatoren.';

    return `${errorLine} ${hintLine}`.trim();
  }

  private buildOpenAiMessages(history: AiChatMessageItem[]) {
    const messages: Array<Record<string, unknown>> = [
      {
        role: 'system',
        content: this.buildSystemInstruction({ includeToolGuidance: true }),
      },
    ];

    for (const message of this.normalizeHistory(history)) {
      messages.push({
        role: message.role,
        content: this.buildMessageContent(message),
      });
    }

    return messages;
  }

  private buildGeminiConversation(history: AiChatMessageItem[]): Content[] {
    return this.normalizeHistory(history).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: this.buildMessageContent(message) }],
    }));
  }

  private buildSystemInstruction(options?: {
    includeToolGuidance?: boolean;
  }): string {
    const baseInstruction =
      'You are Songbird, the Sapling assistant. Songbird is your name, and if the user asks for your name you should say that your name is Songbird. Address the user informally when speaking German and consistently use du, dir, dich, dein, and deine; avoid the formal forms Sie and Ihre. Use the persisted page context from the latest user message when it is relevant and answer concisely.';
    const toolInstruction = options?.includeToolGuidance
      ? ' Use available tools automatically when they are needed to answer with current Sapling data. For questions about the current user identity, profile, company, department, language, or roles, use the current_person tool. Before querying or mutating an unfamiliar Sapling entity, inspect its schema first and only use fields and relation names returned by the schema tool.'
      : '';

    return `${baseInstruction}${toolInstruction} ${this.buildCurrentDateInstruction()}`.trim();
  }

  private buildCurrentDateInstruction(
    referenceDate: Date = new Date(),
  ): string {
    const offsetMinutes = -referenceDate.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffsetMinutes = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absoluteOffsetMinutes / 60)).padStart(
      2,
      '0',
    );
    const offsetRemainderMinutes = String(absoluteOffsetMinutes % 60).padStart(
      2,
      '0',
    );

    return [
      `Current server date and time: ${referenceDate.toISOString()}.`,
      `Server local date: ${this.formatLocalDate(referenceDate)}.`,
      `Server timezone offset: UTC${offsetSign}${offsetHours}:${offsetRemainderMinutes}.`,
      'Interpret relative date expressions such as "today", "yesterday", "this week", and "this month" using the server local date unless the user explicitly specifies a different date or timezone.',
    ].join(' ');
  }

  private formatLocalDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizeHistory(history: AiChatMessageItem[]): AiChatMessageItem[] {
    return history.filter((message) => {
      if (message.role !== 'user' && message.role !== 'assistant') {
        return false;
      }

      if (
        message.role === 'assistant' &&
        message.status === 'streaming' &&
        !message.content.trim()
      ) {
        return false;
      }

      return true;
    });
  }

  private buildMessageContent(message: AiChatMessageItem): string {
    const contextPrefix =
      message.role === 'user' && message.contextPayload
        ? `\n\nContext: ${JSON.stringify(message.contextPayload)}`
        : '';

    return `${message.content}${contextPrefix}`;
  }

  private buildToolSummary(availableTools: McpToolDescriptor[]): string {
    if (availableTools.length === 0) {
      return '';
    }

    return `\n\nAvailable MCP tools: ${availableTools
      .map((tool) => `${tool.serverName}.${tool.toolName}`)
      .join(
        ', ',
      )}. Use them automatically when they are needed. Direct execution is also available with messages like /tool server.tool {"key":"value"}.`;
  }

  private buildToolRegistry(
    availableTools: McpToolDescriptor[],
  ): AiToolRegistryEntry[] {
    const usedNames = new Set<string>();

    return availableTools.map((descriptor) => {
      const baseName = this.sanitizeToolFunctionName(
        `${descriptor.serverName}__${descriptor.toolName}`,
      );
      let encodedName = baseName;
      let suffix = 2;

      while (usedNames.has(encodedName)) {
        encodedName = this.sanitizeToolFunctionName(`${baseName}_${suffix}`);
        suffix += 1;
      }

      usedNames.add(encodedName);
      return { encodedName, descriptor };
    });
  }

  private sanitizeToolFunctionName(name: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const prefixed = /^[a-zA-Z_]/.test(sanitized)
      ? sanitized
      : `tool_${sanitized}`;
    return prefixed.slice(0, 64);
  }

  private buildOpenAiTools(toolRegistry: AiToolRegistryEntry[]) {
    return toolRegistry.map((entry) => ({
      type: 'function' as const,
      function: {
        name: entry.encodedName,
        description: entry.descriptor.description,
        parameters: this.normalizeJsonSchema(entry.descriptor.inputSchema) ?? {
          type: 'object',
          properties: {},
          additionalProperties: true,
        },
      },
    }));
  }

  private buildGeminiFunctionDeclarations(
    toolRegistry: AiToolRegistryEntry[],
  ): FunctionDeclaration[] {
    return toolRegistry.map((entry) => ({
      name: entry.encodedName,
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          payload: {
            type: SchemaType.STRING,
            description: this.buildGeminiToolPayloadDescription(entry),
          },
        },
        required: ['payload'],
      },
      ...(entry.descriptor.description
        ? { description: entry.descriptor.description }
        : {}),
    }));
  }

  private normalizeJsonSchema(
    schema?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!schema || typeof schema !== 'object') {
      return null;
    }

    const anyOf = Array.isArray(schema.anyOf) ? schema.anyOf : null;

    if (anyOf) {
      const firstObjectSchema = anyOf.find(
        (item): item is Record<string, unknown> =>
          item != null &&
          typeof item === 'object' &&
          (item as Record<string, unknown>).type === 'object',
      );

      if (firstObjectSchema) {
        return this.normalizeJsonSchema(firstObjectSchema);
      }
    }

    return schema;
  }

  private convertJsonSchemaToGemini(
    schema?: Record<string, unknown> | null,
  ): FunctionDeclaration['parameters'] | undefined {
    if (!schema || schema.type !== 'object') {
      return undefined;
    }

    const propertiesRecord =
      schema.properties && typeof schema.properties === 'object'
        ? (schema.properties as Record<string, Record<string, unknown>>)
        : {};

    const properties = Object.fromEntries(
      Object.entries(propertiesRecord)
        .map(([key, value]) => [
          key,
          this.convertJsonSchemaPropertyToGemini(value),
        ])
        .filter(
          (
            entry,
          ): entry is [
            string,
            NonNullable<
              ReturnType<typeof this.convertJsonSchemaPropertyToGemini>
            >,
          ] => entry[1] != null,
        ),
    );

    return {
      type: SchemaType.OBJECT,
      properties:
        properties as unknown as FunctionDeclarationSchema['properties'],
      ...(typeof schema.description === 'string'
        ? { description: schema.description }
        : {}),
      ...(Array.isArray(schema.required)
        ? {
            required: schema.required.filter(
              (item): item is string => typeof item === 'string',
            ),
          }
        : {}),
    };
  }

  private convertJsonSchemaPropertyToGemini(
    schema?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!schema || typeof schema !== 'object') {
      return null;
    }

    if (Array.isArray(schema.anyOf)) {
      const anyOf = schema.anyOf as Array<Record<string, unknown>>;
      const preferred =
        anyOf.find((item) => item.type === 'object') ??
        anyOf.find((item) => item.type === 'string') ??
        anyOf[0];
      return this.convertJsonSchemaPropertyToGemini(preferred);
    }

    switch (schema.type) {
      case 'string':
        return {
          type: SchemaType.STRING,
          ...(typeof schema.description === 'string'
            ? { description: schema.description }
            : {}),
        };
      case 'number':
        return {
          type: SchemaType.NUMBER,
          ...(typeof schema.description === 'string'
            ? { description: schema.description }
            : {}),
        };
      case 'integer':
        return {
          type: SchemaType.INTEGER,
          ...(typeof schema.description === 'string'
            ? { description: schema.description }
            : {}),
        };
      case 'boolean':
        return {
          type: SchemaType.BOOLEAN,
          ...(typeof schema.description === 'string'
            ? { description: schema.description }
            : {}),
        };
      case 'array': {
        const itemSchema =
          schema.items && typeof schema.items === 'object'
            ? this.convertJsonSchemaPropertyToGemini(
                schema.items as Record<string, unknown>,
              )
            : null;

        return {
          type: SchemaType.ARRAY,
          ...(typeof schema.description === 'string'
            ? { description: schema.description }
            : {}),
          ...(itemSchema ? { items: itemSchema } : {}),
        };
      }
      case 'object': {
        const hasExplicitProperties =
          schema.properties &&
          typeof schema.properties === 'object' &&
          Object.keys(schema.properties).length > 0;

        if (!hasExplicitProperties) {
          return {
            type: SchemaType.STRING,
            description: this.buildGeminiJsonStringDescription(
              schema.description,
            ),
          };
        }

        const parameters = this.convertJsonSchemaToGemini(schema);
        return parameters ? { ...parameters } : null;
      }
      default:
        return {
          type: SchemaType.STRING,
          ...(typeof schema.description === 'string'
            ? { description: schema.description }
            : {}),
        };
    }
  }

  private async executeAutomaticToolCall(
    toolRegistry: AiToolRegistryEntry[],
    encodedName: string,
    args: Record<string, unknown>,
    user: PersonItem,
  ) {
    const entry = toolRegistry.find((item) => item.encodedName === encodedName);

    if (!entry) {
      throw new Error('ai.toolNotFound');
    }

    return this.mcpService.executeTool(
      entry.descriptor.serverName,
      entry.descriptor.toolName,
      args,
      user,
    );
  }

  private parseToolArguments(argumentsJson: string): Record<string, unknown> {
    if (!argumentsJson.trim()) {
      return {};
    }

    return this.coerceJsonLikeValues(
      JSON.parse(argumentsJson) as Record<string, unknown>,
    );
  }

  private normalizeFunctionCallArgs(
    functionCall: FunctionCall,
  ): Record<string, unknown> {
    if (!functionCall.args || typeof functionCall.args !== 'object') {
      return {};
    }

    const functionArgs = functionCall.args as Record<string, unknown>;

    if (typeof functionArgs.payload === 'string') {
      const parsedPayload = this.parseJsonLikeValue(functionArgs.payload);

      if (
        parsedPayload &&
        typeof parsedPayload === 'object' &&
        !Array.isArray(parsedPayload)
      ) {
        return this.coerceJsonLikeValues(
          parsedPayload as Record<string, unknown>,
        );
      }
    }

    return this.coerceJsonLikeValues(functionArgs);
  }

  private coerceJsonLikeValues(
    args: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(args).map(([key, value]) => [
        key,
        this.parseJsonLikeValue(value),
      ]),
    );
  }

  private parseJsonLikeValue(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    if (
      !(trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) &&
      !(trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
    ) {
      return value;
    }

    try {
      return JSON.parse(trimmedValue) as unknown;
    } catch {
      return value;
    }
  }

  private buildGeminiJsonStringDescription(description: unknown): string {
    const prefix =
      typeof description === 'string' && description.trim()
        ? `${description.trim()} `
        : '';

    return `${prefix}Provide this value as a JSON string.`.trim();
  }

  private buildGeminiToolPayloadDescription(
    entry: AiToolRegistryEntry,
  ): string {
    const schema = this.normalizeJsonSchema(entry.descriptor.inputSchema);
    const properties =
      schema?.properties && typeof schema.properties === 'object'
        ? Object.keys(schema.properties)
        : [];
    const propertyHint =
      properties.length > 0
        ? `Include a JSON object with keys like: ${properties.join(', ')}.`
        : "Include a JSON object with this tool's arguments.";

    return `${propertyHint} Provide the full object as a JSON string.`;
  }

  private createOpenAiClient(provider: AiProviderTypeItem): OpenAI {
    const apiKey = this.getProviderCredential(provider, 'openAiApiKey');

    if (!apiKey) {
      throw new Error('ai.providerNotConfigured');
    }

    return new OpenAI({ apiKey });
  }

  private createGeminiClient(provider: AiProviderTypeItem): GoogleGenerativeAI {
    const apiKey = this.getProviderCredential(provider, 'geminiApiKey');

    if (!apiKey) {
      throw new Error('ai.providerNotConfigured');
    }

    return new GoogleGenerativeAI(apiKey);
  }

  private getProviderCredential(
    provider: AiProviderTypeItem,
    key: string,
  ): string | null {
    const credentials = provider.credentials;

    if (!credentials || typeof credentials !== 'object') {
      return null;
    }

    const value = credentials[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private hasUsableProviderCredentials(
    provider?: AiProviderTypeItem | null,
  ): boolean {
    if (!provider) {
      return false;
    }

    if (provider.handle === 'gemini') {
      return this.getProviderCredential(provider, 'geminiApiKey') != null;
    }

    return this.getProviderCredential(provider, 'openAiApiKey') != null;
  }

  private extractPersonReference(
    person?: PersonItem | number | null,
  ): PersonItem | number {
    if (typeof person === 'number') {
      return person;
    }

    if (person?.handle != null) {
      return person.handle;
    }

    return 0;
  }

  private sanitizeProvider(provider: AiProviderTypeItem): AiProviderTypeItem {
    return {
      handle: provider.handle,
      title: provider.title,
      icon: provider.icon,
      color: provider.color,
      credentialTypes: provider.credentialTypes,
      isActive: provider.isActive,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      credentials: undefined,
    } as AiProviderTypeItem;
  }

  private sanitizeModel(model: AiProviderModelItem): AiProviderModelItem {
    return {
      handle: model.handle,
      title: model.title,
      description: model.description,
      provider:
        model.provider && typeof model.provider !== 'string'
          ? this.sanitizeProvider(model.provider)
          : model.provider,
      providerModel: model.providerModel,
      supportsStreaming: model.supportsStreaming,
      supportsTools: model.supportsTools,
      maxToolCallIterations: model.maxToolCallIterations,
      isDefault: model.isDefault,
      isActive: model.isActive,
      sortOrder: model.sortOrder,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    } as AiProviderModelItem;
  }

  private sanitizeChatSession(session: AiChatSessionItem): AiChatSessionItem {
    return {
      handle: session.handle,
      title: session.title,
      isArchived: session.isArchived,
      provider:
        session.provider && typeof session.provider !== 'string'
          ? this.sanitizeProvider(session.provider)
          : session.provider,
      model:
        session.model && typeof session.model !== 'string'
          ? this.sanitizeModel(session.model)
          : session.model,
      lastMessageAt: session.lastMessageAt,
      person: this.extractPersonReference(session.person),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    } as AiChatSessionItem;
  }

  private sanitizeChatMessage(message: AiChatMessageItem): AiChatMessageItem {
    return {
      handle: message.handle,
      session:
        message.session && typeof message.session !== 'number'
          ? (message.session.handle ?? 0)
          : message.session,
      person: this.extractPersonReference(message.person),
      role: message.role,
      status: message.status,
      sequence: message.sequence,
      content: message.content,
      contextPayload: message.contextPayload ?? null,
      toolCalls: message.toolCalls ?? null,
      requestPayload: message.requestPayload ?? null,
      responsePayload: message.responsePayload ?? null,
      provider: message.provider ?? null,
      model: message.model ?? null,
      url: message.url ?? null,
      routeName: message.routeName ?? null,
      pageTitle: message.pageTitle ?? null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    } as unknown as AiChatMessageItem;
  }
}
