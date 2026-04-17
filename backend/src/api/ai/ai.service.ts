import { EntityManager } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PersonItem } from '../../entity/PersonItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import {
  CreateAiChatMessageDto,
  CreateAiChatSessionDto,
  UpdateAiChatSessionDto,
} from './dto/chat.dto';
import { McpService, type McpToolDescriptor } from './mcp.service';

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
   * AI provider type.
   * @type {'openai'|'gemini'}
   */
  private provider: 'openai' | 'gemini';

  /**
   * OpenAI client instance.
   * @type {OpenAI|null}
   */
  private openai: OpenAI | null = null;

  /**
   * Gemini client instance.
   * @type {GoogleGenerativeAI|null}
   */
  private gemini: GoogleGenerativeAI | null = null;

  /**
   * Service for accessing configuration values.
   * @type {ConfigService}
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly em: EntityManager,
    private readonly mcpService: McpService,
  ) {
    this.provider = this.configService.get<string>('AI_PROVIDER', 'openai') as
      | 'openai'
      | 'gemini';
    if (this.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.configService.get<string>('AI_OPENAI_API_KEY', ''),
      });
    } else if (this.provider === 'gemini') {
      this.gemini = new GoogleGenerativeAI(
        this.configService.get<string>('AI_GEMINI_API_KEY', ''),
      );
    }
  }

  /**
   * Returns an answer to a question using the configured AI provider.
   * @param question The question to ask
   * @returns Answer as a string
   */
  async ask(question: string): Promise<string> {
    if (this.provider === 'openai' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: question }],
      });
      return response.choices[0]?.message?.content || '';
    } else if (this.provider === 'gemini' && this.gemini) {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(question);
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
      : await this.createChatSession(
          {
            title: dto.sessionTitle ?? this.buildSessionTitle(dto.content),
            provider: dto.provider,
            model: dto.model,
          },
          user,
        );

    const nextSequence = await this.getNextSequence(session.handle ?? 0);
    const provider = this.resolveProvider(dto.provider ?? session.provider ?? null);
    const model = this.resolveModel(provider, dto.model ?? session.model ?? null);
    const availableTools = await this.mcpService.listActiveTools();

    const userMessage = this.em.create(AiChatMessageItem, {
      session,
      person,
      role: 'user',
      status: 'persisted',
      sequence: nextSequence,
      content: dto.content,
      contextPayload: dto.contextPayload ?? null,
      provider,
      model,
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
      provider,
      model,
      contextPayload: dto.contextPayload ?? null,
      url: dto.url ?? null,
      routeName: dto.routeName ?? null,
      pageTitle: dto.pageTitle ?? null,
    });

    session.provider = provider;
    session.model = model;
    session.lastMessageAt = new Date();
    this.em.persist([userMessage, assistantMessage]);
    await this.em.flush();

    await onEvent({ type: 'session.upsert', session });
    await onEvent({ type: 'message.user', message: userMessage });
    await onEvent({ type: 'message.assistant', message: assistantMessage });
    await onEvent({ type: 'mcp.tools', tools: availableTools });

    const inlineToolExecution = await this.mcpService.tryExecuteInlineToolCommand(
      dto.content,
    );

    if (inlineToolExecution) {
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
        rawResult: inlineToolExecution.rawResult,
      };
      await this.em.flush();
      await onEvent({ type: 'message.completed', message: assistantMessage, session });
      return { session, userMessage, assistantMessage };
    }

    try {
      const history = await this.loadSessionHistory(session.handle ?? 0);

      if (provider === 'openai') {
        await this.streamOpenAi(history, model, availableTools, async (delta) => {
          if (!delta) {
            return;
          }

          assistantMessage.content += delta;
          await onEvent({
            type: 'message.delta',
            handle: assistantMessage.handle,
            delta,
          });
        });
      } else {
        await this.streamGemini(history, model, availableTools, async (delta) => {
          if (!delta) {
            return;
          }

          assistantMessage.content += delta;
          await onEvent({
            type: 'message.delta',
            handle: assistantMessage.handle,
            delta,
          });
        });
      }

      assistantMessage.status = 'completed';
      assistantMessage.responsePayload = {
        provider,
        model,
        completedAt: new Date().toISOString(),
      };
      await this.em.flush();

      await onEvent({ type: 'message.completed', message: assistantMessage, session });
      return { session, userMessage, assistantMessage };
    } catch (error) {
      assistantMessage.status = 'failed';
      assistantMessage.responsePayload = {
        provider,
        model,
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

    return this.em.find(
      AiChatSessionItem,
      {
        person: { handle: userHandle },
        ...(includeArchived ? {} : { isArchived: false }),
      },
      { orderBy: { updatedAt: 'DESC' } },
    );
  }

  async createChatSession(
    dto: CreateAiChatSessionDto,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const person = await this.requireManagedUser(user);

    const session = this.em.create(AiChatSessionItem, {
      title: dto.title?.trim() || 'New Chat',
      isArchived: false,
      provider: dto.provider ?? this.provider,
      model: dto.model ?? null,
      person,
      lastMessageAt: null,
    });

    this.em.persist(session);
    await this.em.flush();
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

    if (dto.provider !== undefined) {
      session.provider = dto.provider;
    }

    if (dto.model !== undefined) {
      session.model = dto.model;
    }

    await this.em.flush();
    return session;
  }

  async listChatMessages(
    sessionHandle: number,
    user: PersonItem,
  ): Promise<AiChatMessageItem[]> {
    const userHandle = this.requireUserHandle(user);
    await this.findOwnedSession(sessionHandle, user);

    return this.em.find(
      AiChatMessageItem,
      { session: { handle: sessionHandle }, person: { handle: userHandle } },
      { orderBy: { sequence: 'ASC' } },
    );
  }

  async createChatMessage(
    dto: CreateAiChatMessageDto,
    user: PersonItem,
  ): Promise<{ session: AiChatSessionItem; message: AiChatMessageItem }> {
    const person = await this.requireManagedUser(user);
    const session = dto.sessionHandle
      ? await this.findOwnedSession(dto.sessionHandle, user)
      : await this.createChatSession(
          {
            title: dto.sessionTitle ?? this.buildSessionTitle(dto.content),
            provider: dto.provider,
            model: dto.model,
          },
          user,
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
      provider: dto.provider ?? session.provider ?? this.provider,
      model: dto.model ?? session.model ?? null,
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
    if (!session.title?.trim()) {
      session.title = this.buildSessionTitle(dto.content);
    }

    this.em.persist(message);
    await this.em.flush();
    return { session, message };
  }

  private async findOwnedSession(
    handle: number,
    user: PersonItem,
  ): Promise<AiChatSessionItem> {
    const userHandle = this.requireUserHandle(user);

    const session = await this.em.findOne(AiChatSessionItem, {
      handle,
      person: { handle: userHandle },
    });

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

  private resolveProvider(preferredProvider?: string | null): 'openai' | 'gemini' {
    return preferredProvider === 'gemini' ? 'gemini' : 'openai';
  }

  private resolveModel(provider: 'openai' | 'gemini', preferredModel?: string | null): string {
    if (preferredModel?.trim()) {
      return preferredModel.trim();
    }

    if (provider === 'gemini') {
      return this.configService.get<string>('AI_GEMINI_MODEL', 'gemini-1.5-flash');
    }

    return this.configService.get<string>('AI_OPENAI_MODEL', 'gpt-4.1-mini');
  }

  private async getNextSequence(sessionHandle: number): Promise<number> {
    const latestMessage = await this.em.find(
      AiChatMessageItem,
      { session: { handle: sessionHandle } },
      { orderBy: { sequence: 'DESC' }, limit: 1 },
    );

    return (latestMessage[0]?.sequence ?? 0) + 1;
  }

  private async loadSessionHistory(sessionHandle: number): Promise<AiChatMessageItem[]> {
    return this.em.find(
      AiChatMessageItem,
      { session: { handle: sessionHandle } },
      { orderBy: { sequence: 'ASC' } },
    );
  }

  private async streamOpenAi(
    history: AiChatMessageItem[],
    model: string,
    availableTools: McpToolDescriptor[],
    onDelta: (delta: string) => Promise<void>,
  ): Promise<void> {
    if (!this.openai) {
      throw new Error('ai.providerNotConfigured');
    }

    const response = await this.openai.chat.completions.create({
      model,
      stream: true,
      messages: this.buildOpenAiMessages(history, availableTools),
    });

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      await onDelta(delta);
    }
  }

  private async streamGemini(
    history: AiChatMessageItem[],
    modelName: string,
    availableTools: McpToolDescriptor[],
    onDelta: (delta: string) => Promise<void>,
  ): Promise<void> {
    if (!this.gemini) {
      throw new Error('ai.providerNotConfigured');
    }

    const model = this.gemini.getGenerativeModel({ model: modelName });
    const result = await model.generateContentStream(
      this.buildGeminiPrompt(history, availableTools),
    );

    for await (const chunk of result.stream) {
      const delta = chunk.text();
      await onDelta(delta);
    }
  }

  private buildOpenAiMessages(
    history: AiChatMessageItem[],
    availableTools: McpToolDescriptor[],
  ) {
    const toolSummary = this.buildToolSummary(availableTools);
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content:
          'You are the Sapling assistant. Use the persisted page context from the latest user message when it is relevant and answer concisely.' +
          toolSummary,
      },
    ];

    for (const message of history) {
      if (message.role !== 'user' && message.role !== 'assistant') {
        continue;
      }

      const contextPrefix =
        message.role === 'user' && message.contextPayload
          ? `\n\nContext: ${JSON.stringify(message.contextPayload)}`
          : '';

      messages.push({
        role: message.role,
        content: `${message.content}${contextPrefix}`,
      });
    }

    return messages;
  }

  private buildGeminiPrompt(
    history: AiChatMessageItem[],
    availableTools: McpToolDescriptor[],
  ): string {
    const toolSummary = this.buildToolSummary(availableTools);

    return `${toolSummary}\n\n${history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => {
        const contextPrefix =
          message.role === 'user' && message.contextPayload
            ? `\nContext: ${JSON.stringify(message.contextPayload)}`
            : '';

        return `${message.role.toUpperCase()}: ${message.content}${contextPrefix}`;
      })
      .join('\n\n')}`.trim();
  }

  private buildToolSummary(availableTools: McpToolDescriptor[]): string {
    if (availableTools.length === 0) {
      return '';
    }

    return `\n\nAvailable MCP tools: ${availableTools
      .map((tool) => `${tool.serverName}.${tool.toolName}`)
      .join(', ')}. Direct execution is currently available with messages like /tool server.tool {"key":"value"}.`;
  }
}
