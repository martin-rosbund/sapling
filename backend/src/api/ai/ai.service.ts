import { createHash } from 'node:crypto';
import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { OpenAI } from 'openai';
import {
  GoogleGenerativeAI,
  SchemaType,
  TaskType,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Part,
} from '@google/generative-ai';
import { PersonItem } from '../../entity/PersonItem';
import { TicketItem } from '../../entity/TicketItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import {
  AiChatMessageListResponseDto,
  AiChatMessageListMetaDto,
  CreateAiChatMessageDto,
  CreateAiChatSessionDto,
  ListAiChatMessagesQueryDto,
  UpdateAiChatSessionDto,
} from './dto/chat.dto';
import { McpService, type McpToolDescriptor } from './mcp.service';
import {
  VectorizeEntityDto,
  VectorizeEntityResponseDto,
} from './dto/vectorization.dto';
import { GenericService } from '../generic/generic.service';

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
  kind: 'list' | 'record' | 'route';
};

type AiStreamResult = {
  toolCalls: AiExecutedToolCall[];
};

type AiToolRegistryEntry = {
  encodedName: string;
  descriptor: McpToolDescriptor;
};

type AiProviderCapability = 'chat' | 'embedding';

type AiEmbeddingPurpose = 'document' | 'query';

type AiChatMessagePage = {
  messages: AiChatMessageItem[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextBeforeSequence: number | null;
  };
};

type AiEmbeddingTarget = {
  provider: AiProviderTypeItem;
  model: AiProviderModelItem;
  providerKind: 'openai' | 'gemini';
};

type AiVectorDocumentDraft = {
  sourceRecordHandle: string;
  sourceSection: string;
  chunkIndex: number;
  title: string | null;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown> | null;
};

type AiVectorDocumentRow = {
  handle: number;
  source_record_handle: string;
  source_section: string;
  chunk_index: number;
  title: string | null;
  content: string;
  content_hash: string;
  metadata: Record<string, unknown> | null;
  provider_handle: string;
  model_handle: string;
  embedding_dimensions: number;
};

type AiVectorIndexRow = {
  provider_handle: string;
  model_handle: string;
  document_count: number | string;
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
  private readonly chatMessagePageSize = 100;
  private readonly maxChatMessagePageSize = 100;
  private readonly streamHistoryMessageLimit = 24;
  private readonly embeddingBatchSize = 32;
  private readonly vectorChunkLength = 1200;
  private readonly vectorChunkOverlap = 200;
  private readonly vectorSearchCandidateMultiplier = 6;
  private readonly maxVectorSearchCandidateLimit = 60;
  private readonly maxVectorSearchResults = 10;

  /**
   * Service for accessing configuration values.
   * @type {ConfigService}
   */
  constructor(
    private readonly em: EntityManager,
    @Inject(forwardRef(() => McpService))
    private readonly mcpService: McpService,
    private readonly genericService: GenericService,
  ) {}

  async listActiveProviders(
    capability: AiProviderCapability = 'chat',
  ): Promise<AiProviderTypeItem[]> {
    const activeModels = await this.listActiveModels(undefined, capability);
    const providerHandles = new Set(
      activeModels
        .map((model) => this.extractProviderHandle(model.provider))
        .filter((handle): handle is string => !!handle),
    );

    if (providerHandles.size === 0) {
      return [];
    }

    const providers = await this.em.find(
      AiProviderTypeItem,
      {
        isActive: true,
        handle: { $in: [...providerHandles] },
      },
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
    capability: AiProviderCapability = 'chat',
  ): Promise<AiProviderModelItem[]> {
    const models = await this.em.find(
      AiProviderModelItem,
      {
        isActive: true,
        ...this.buildModelCapabilityFilter(capability),
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

  async vectorizeEntity(
    dto: VectorizeEntityDto,
  ): Promise<VectorizeEntityResponseDto> {
    const entityHandle = dto.entityHandle.trim();
    const embeddingTarget = await this.resolveEmbeddingTarget(
      dto.providerHandle,
      dto.modelHandle,
    );
    const documents = await this.buildVectorDocuments(entityHandle);
    const connection = this.em.getConnection();
    const existingRows = (await connection.execute(
      `select "handle", "source_record_handle", "source_section", "chunk_index", "title", "content", "content_hash", "metadata", "provider_handle", "model_handle", "embedding_dimensions"
       from "ai_vector_document_item"
       where "source_entity_handle" = ?`,
      [entityHandle],
    )) as AiVectorDocumentRow[];

    const existingByKey = new Map(
      existingRows.map((row) => [this.buildVectorDocumentKey(row), row]),
    );
    const nextKeys = new Set(
      documents.map((document) => this.buildVectorDocumentKey(document)),
    );
    const documentsToDelete = existingRows.filter(
      (row) => !nextKeys.has(this.buildVectorDocumentKey(row)),
    );
    const documentsToEmbed = documents.filter((document) => {
      const existingRow = existingByKey.get(
        this.buildVectorDocumentKey(document),
      );

      if (!existingRow) {
        return true;
      }

      return (
        existingRow.content_hash !== document.contentHash ||
        existingRow.provider_handle !== embeddingTarget.provider.handle ||
        existingRow.model_handle !== embeddingTarget.model.handle
      );
    });
    const embeddings = await this.embedTexts(
      documentsToEmbed.map((document) => document.content),
      embeddingTarget,
      'document',
    );

    await this.em.transactional(async (transactionalEm) => {
      const transactionalConnection = transactionalEm.getConnection();

      for (const row of documentsToDelete) {
        await transactionalConnection.execute(
          `delete from "ai_vector_document_item" where "handle" = ?`,
          [row.handle],
        );
      }

      for (const [index, document] of documentsToEmbed.entries()) {
        const existingRow = existingByKey.get(
          this.buildVectorDocumentKey(document),
        );
        const embedding = embeddings[index] ?? [];
        const vectorLiteral = this.toVectorLiteral(embedding);
        const metadata = document.metadata
          ? JSON.stringify(document.metadata)
          : null;

        if (existingRow) {
          await transactionalConnection.execute(
            `update "ai_vector_document_item"
             set "title" = ?, "content" = ?, "content_hash" = ?, "metadata" = ?::jsonb, "provider_handle" = ?, "model_handle" = ?, "embedding_dimensions" = ?, "embedding" = ?::vector, "updated_at" = now()
             where "handle" = ?`,
            [
              document.title,
              document.content,
              document.contentHash,
              metadata,
              embeddingTarget.provider.handle,
              embeddingTarget.model.handle,
              embedding.length,
              vectorLiteral,
              existingRow.handle,
            ],
          );
          continue;
        }

        await transactionalConnection.execute(
          `insert into "ai_vector_document_item"
           ("source_entity_handle", "source_record_handle", "source_section", "chunk_index", "title", "content", "content_hash", "metadata", "provider_handle", "model_handle", "embedding_dimensions", "embedding", "created_at", "updated_at")
           values (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?::vector, now(), now())`,
          [
            entityHandle,
            document.sourceRecordHandle,
            document.sourceSection,
            document.chunkIndex,
            document.title,
            document.content,
            document.contentHash,
            metadata,
            embeddingTarget.provider.handle,
            embeddingTarget.model.handle,
            embedding.length,
            vectorLiteral,
          ],
        );
      }
    });

    const response = new VectorizeEntityResponseDto();
    response.entityHandle = entityHandle;
    response.providerHandle = embeddingTarget.provider.handle;
    response.modelHandle = embeddingTarget.model.handle;
    response.totalSourceRecords = new Set(
      documents.map((document) => document.sourceRecordHandle),
    ).size;
    response.totalDocuments = documents.length;
    response.embeddedDocuments = documentsToEmbed.length;
    response.skippedDocuments = documents.length - documentsToEmbed.length;
    response.deletedDocuments = documentsToDelete.length;
    return response;
  }

  async searchVectorDocuments(
    entityHandle: string,
    query: string,
    user: PersonItem,
    limit = 5,
  ): Promise<Record<string, unknown>> {
    const normalizedEntityHandle = entityHandle.trim();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      throw new BadRequestException('ai.vectorSearchQueryMissing');
    }

    this.assertVectorizableEntity(normalizedEntityHandle);
    const index = await this.getVectorIndex(normalizedEntityHandle);

    if (!index) {
      return {
        entityHandle: normalizedEntityHandle,
        query: normalizedQuery,
        indexed: false,
        results: [],
        usageHints: [
          'Ask an administrator to run vectorization for this entity before using semantic search.',
        ],
      };
    }

    const embeddingTarget = await this.resolveEmbeddingTarget(
      index.provider_handle,
      index.model_handle,
    );
    const [queryEmbedding] = await this.embedTexts(
      [normalizedQuery],
      embeddingTarget,
      'query',
    );
    const candidateLimit = Math.min(
      Math.max(limit, 1) * this.vectorSearchCandidateMultiplier,
      this.maxVectorSearchCandidateLimit,
    );
    const vectorLiteral = this.toVectorLiteral(queryEmbedding ?? []);
    const rows = (await this.em.getConnection().execute(
      `select "source_record_handle", "source_section", "chunk_index", "title", "content", "metadata",
              1 - ("embedding" <=> ?::vector) as "similarity"
       from "ai_vector_document_item"
       where "source_entity_handle" = ?
       order by "embedding" <=> ?::vector asc
       limit ?`,
      [vectorLiteral, normalizedEntityHandle, vectorLiteral, candidateLimit],
    )) as Array<{
      source_record_handle: string;
      source_section: string;
      chunk_index: number;
      title: string | null;
      content: string;
      metadata: Record<string, unknown> | null;
      similarity: number | string;
    }>;

    const groupedRows = new Map<
      string,
      {
        score: number;
        matches: Array<{
          score: number;
          section: string;
          chunkIndex: number;
          title: string | null;
          excerpt: string;
          metadata: Record<string, unknown> | null;
        }>;
      }
    >();

    for (const row of rows) {
      const key = row.source_record_handle;
      const similarity = this.asSimilarityScore(row.similarity);
      const match = {
        score: similarity,
        section: row.source_section,
        chunkIndex: row.chunk_index,
        title: row.title,
        excerpt: this.buildVectorExcerpt(row.content),
        metadata: row.metadata ?? null,
      };
      const existingGroup = groupedRows.get(key);

      if (existingGroup) {
        existingGroup.score = Math.max(existingGroup.score, similarity);
        existingGroup.matches.push(match);
        continue;
      }

      groupedRows.set(key, {
        score: similarity,
        matches: [match],
      });
    }

    const accessibleRecords = await this.loadVectorSearchRecords(
      normalizedEntityHandle,
      [...groupedRows.keys()],
      user,
    );
    const results = accessibleRecords
      .map((record) => {
        const recordHandle =
          record && typeof record === 'object' && 'handle' in record
            ? String((record as { handle?: unknown }).handle ?? '')
            : '';
        const groupedResult = groupedRows.get(recordHandle);

        if (!groupedResult) {
          return null;
        }

        return {
          handle: this.coerceVectorRecordHandle(recordHandle),
          score: groupedResult.score,
          record,
          matches: groupedResult.matches
            .sort((left, right) => right.score - left.score)
            .slice(0, 3),
        };
      })
      .filter(
        (
          result,
        ): result is {
          handle: string | number;
          score: number;
          record: object;
          matches: Array<{
            score: number;
            section: string;
            chunkIndex: number;
            title: string | null;
            excerpt: string;
            metadata: Record<string, unknown> | null;
          }>;
        } => result != null,
      )
      .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))
      .slice(0, Math.min(Math.max(limit, 1), this.maxVectorSearchResults));

    return {
      entityHandle: normalizedEntityHandle,
      query: normalizedQuery,
      indexed: true,
      providerHandle: embeddingTarget.provider.handle,
      modelHandle: embeddingTarget.model.handle,
      indexedDocumentCount: Number(index.document_count) || 0,
      searchableSections: ['overview', 'problem', 'solution'],
      results,
      usageHints: [
        'Use semantic search for natural-language problem descriptions, symptoms, and workaround requests.',
        'Use ticket_search for exact ticket numbers, strict keywords, or external references.',
      ],
    };
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
      const history = await this.loadSessionHistory(
        session.handle ?? 0,
        this.requireUserHandle(person),
      );

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
      assistantMessage.content = this.alignAssistantContentWithNavigationLinks(
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
      this.sanitizeChatMessage(message),
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
  ): Promise<AiEmbeddingTarget> {
    return this.resolveAiTarget(
      preferredProviderHandle,
      preferredModelHandle,
      'chat',
    );
  }

  private async resolveEmbeddingTarget(
    preferredProviderHandle?: string | null,
    preferredModelHandle?: string | null,
  ): Promise<AiEmbeddingTarget> {
    return this.resolveAiTarget(
      preferredProviderHandle,
      preferredModelHandle,
      'embedding',
    );
  }

  private async resolveAiTarget(
    preferredProviderHandle: string | null | undefined,
    preferredModelHandle: string | null | undefined,
    capability: AiProviderCapability,
  ): Promise<AiEmbeddingTarget> {
    const model = preferredModelHandle?.trim()
      ? await this.findModelByHandle(preferredModelHandle.trim(), capability)
      : preferredProviderHandle?.trim()
        ? await this.findDefaultModelForProvider(
            preferredProviderHandle.trim(),
            capability,
          )
        : await this.getDefaultModelConfig(capability);

    if (!model) {
      throw new NotFoundException(
        capability === 'embedding'
          ? 'ai.embeddingModelNotFound'
          : 'ai.modelNotFound',
      );
    }

    await this.em.populate(model, ['provider']);
    const provider = model.provider;

    if (!this.hasUsableProviderCredentials(provider)) {
      throw new Error(
        capability === 'embedding'
          ? 'ai.embeddingProviderNotConfigured'
          : 'ai.providerNotConfigured',
      );
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

  private buildModelCapabilityFilter(
    capability: AiProviderCapability,
  ): Record<string, boolean> {
    return capability === 'embedding'
      ? { supportsEmbeddings: true }
      : { supportsStreaming: true };
  }

  private async getDefaultModelConfig(
    capability: AiProviderCapability = 'chat',
  ): Promise<AiProviderModelItem | null> {
    const models = await this.em.find(
      AiProviderModelItem,
      {
        isActive: true,
        ...this.buildModelCapabilityFilter(capability),
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

    return (
      models.find((model) =>
        this.hasUsableProviderCredentials(model.provider as AiProviderTypeItem),
      ) ?? null
    );
  }

  private async findDefaultModelForProvider(
    providerHandle: string,
    capability: AiProviderCapability = 'chat',
  ): Promise<AiProviderModelItem | null> {
    const models = await this.em.find(
      AiProviderModelItem,
      {
        isActive: true,
        ...this.buildModelCapabilityFilter(capability),
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
    capability: AiProviderCapability = 'chat',
  ): Promise<AiProviderModelItem | null> {
    return this.em.findOne(
      AiProviderModelItem,
      {
        handle,
        isActive: true,
        ...this.buildModelCapabilityFilter(capability),
      },
      { populate: ['provider'] },
    );
  }

  private assertVectorizableEntity(entityHandle: string): void {
    if (entityHandle === 'ticket') {
      return;
    }

    throw new BadRequestException('ai.vectorizationUnsupportedEntity');
  }

  private async buildVectorDocuments(
    entityHandle: string,
  ): Promise<AiVectorDocumentDraft[]> {
    this.assertVectorizableEntity(entityHandle);

    switch (entityHandle) {
      case 'ticket':
        return this.buildTicketVectorDocuments();
      default:
        throw new BadRequestException('ai.vectorizationUnsupportedEntity');
    }
  }

  private async buildTicketVectorDocuments(): Promise<AiVectorDocumentDraft[]> {
    const tickets = await this.em.find(
      TicketItem,
      {},
      {
        populate: [
          'status',
          'priority',
          'creatorCompany',
          'creatorPerson',
          'assigneeCompany',
          'assigneePerson',
        ],
        orderBy: { updatedAt: 'DESC' },
      },
    );
    const documents: AiVectorDocumentDraft[] = [];

    for (const ticket of tickets) {
      if (ticket.handle == null) {
        continue;
      }

      const sourceRecordHandle = String(ticket.handle);
      const title = ticket.title?.trim() || ticket.number?.trim() || null;
      const metadata = this.buildTicketVectorMetadata(ticket);

      documents.push(
        ...this.createTicketVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          this.buildTicketSectionContent(ticket, 'overview'),
          title,
          metadata,
        ),
      );
      documents.push(
        ...this.createTicketVectorSectionDocuments(
          sourceRecordHandle,
          'problem',
          this.buildTicketSectionContent(ticket, 'problem'),
          title,
          metadata,
        ),
      );
      documents.push(
        ...this.createTicketVectorSectionDocuments(
          sourceRecordHandle,
          'solution',
          this.buildTicketSectionContent(ticket, 'solution'),
          title,
          metadata,
        ),
      );
    }

    return documents;
  }

  private createTicketVectorSectionDocuments(
    sourceRecordHandle: string,
    sourceSection: string,
    content: string,
    title: string | null,
    metadata: Record<string, unknown>,
  ): AiVectorDocumentDraft[] {
    const chunks = this.chunkVectorContent(content);

    return chunks.map((chunk, index) => ({
      sourceRecordHandle,
      sourceSection,
      chunkIndex: index,
      title,
      content: chunk,
      contentHash: this.hashVectorContent(chunk),
      metadata: {
        ...metadata,
        section: sourceSection,
        chunkIndex: index,
      },
    }));
  }

  private buildTicketSectionContent(
    ticket: TicketItem,
    section: 'overview' | 'problem' | 'solution',
  ): string {
    const lines = [
      `Ticket: ${ticket.number?.trim() || ticket.handle || ''}`.trim(),
      ticket.externalNumber?.trim()
        ? `External ticket number: ${ticket.externalNumber.trim()}`
        : null,
      ticket.title?.trim() ? `Title: ${ticket.title.trim()}` : null,
      ticket.status && typeof ticket.status !== 'string'
        ? `Status: ${ticket.status.description}`
        : null,
      ticket.priority && typeof ticket.priority !== 'string'
        ? `Priority: ${ticket.priority.description}`
        : null,
      ticket.creatorCompany &&
      typeof ticket.creatorCompany !== 'string' &&
      'name' in ticket.creatorCompany
        ? `Creator company: ${String(ticket.creatorCompany.name ?? '').trim()}`
        : null,
      ticket.creatorPerson &&
      typeof ticket.creatorPerson !== 'string' &&
      'firstName' in ticket.creatorPerson
        ? `Creator person: ${this.buildPersonLabel(
            ticket.creatorPerson.firstName,
            ticket.creatorPerson.lastName,
            ticket.creatorPerson.email,
          )}`
        : null,
      ticket.assigneeCompany &&
      typeof ticket.assigneeCompany !== 'string' &&
      'name' in ticket.assigneeCompany
        ? `Assignee company: ${String(ticket.assigneeCompany.name ?? '').trim()}`
        : null,
      ticket.assigneePerson &&
      typeof ticket.assigneePerson !== 'string' &&
      'firstName' in ticket.assigneePerson
        ? `Assignee person: ${this.buildPersonLabel(
            ticket.assigneePerson.firstName,
            ticket.assigneePerson.lastName,
            ticket.assigneePerson.email,
          )}`
        : null,
      null,
    ].filter((line): line is string => !!line && line.trim().length > 0);

    if (section === 'overview') {
      lines.push('Section: Overview');
      const summaryLines = [
        ticket.problemDescription?.trim()
          ? `Problem summary: ${this.summarizeVectorText(ticket.problemDescription)}`
          : null,
        ticket.solutionDescription?.trim()
          ? `Solution summary: ${this.summarizeVectorText(ticket.solutionDescription)}`
          : null,
      ].filter((line): line is string => !!line && line.trim().length > 0);

      lines.push(...summaryLines);
      return lines.join('\n');
    }

    const sectionLabel =
      section === 'problem' ? 'Problem description' : 'Solution description';
    const sectionBody =
      section === 'problem'
        ? (ticket.problemDescription?.trim() ?? '')
        : (ticket.solutionDescription?.trim() ?? '');

    if (!sectionBody) {
      return '';
    }

    lines.push(`Section: ${sectionLabel}`);
    lines.push(sectionBody);
    return lines.join('\n');
  }

  private buildTicketVectorMetadata(
    ticket: TicketItem,
  ): Record<string, unknown> {
    return {
      ticketHandle: ticket.handle ?? null,
      ticketNumber: ticket.number?.trim() || null,
      externalNumber: ticket.externalNumber?.trim() || null,
      title: ticket.title?.trim() || null,
      status:
        ticket.status && typeof ticket.status !== 'string'
          ? ticket.status.description
          : null,
      priority:
        ticket.priority && typeof ticket.priority !== 'string'
          ? ticket.priority.description
          : null,
      creatorCompany:
        ticket.creatorCompany &&
        typeof ticket.creatorCompany !== 'string' &&
        'name' in ticket.creatorCompany
          ? ticket.creatorCompany.name
          : null,
      creatorPerson:
        ticket.creatorPerson &&
        typeof ticket.creatorPerson !== 'string' &&
        'firstName' in ticket.creatorPerson
          ? this.buildPersonLabel(
              ticket.creatorPerson.firstName,
              ticket.creatorPerson.lastName,
              ticket.creatorPerson.email,
            )
          : null,
      assigneeCompany:
        ticket.assigneeCompany &&
        typeof ticket.assigneeCompany !== 'string' &&
        'name' in ticket.assigneeCompany
          ? ticket.assigneeCompany.name
          : null,
      assigneePerson:
        ticket.assigneePerson &&
        typeof ticket.assigneePerson !== 'string' &&
        'firstName' in ticket.assigneePerson
          ? this.buildPersonLabel(
              ticket.assigneePerson.firstName,
              ticket.assigneePerson.lastName,
              ticket.assigneePerson.email,
            )
          : null,
    };
  }

  private buildPersonLabel(
    firstName?: string | null,
    lastName?: string | null,
    email?: string | null,
  ): string {
    const fullName = [firstName, lastName]
      .filter(
        (part): part is string =>
          typeof part === 'string' && part.trim().length > 0,
      )
      .join(' ')
      .trim();

    return fullName || email?.trim() || '';
  }

  private summarizeVectorText(value?: string | null, maxLength = 240): string {
    const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private chunkVectorContent(content: string): string[] {
    const normalized = content.replace(/\r\n/g, '\n').trim();

    if (!normalized) {
      return [];
    }

    if (normalized.length <= this.vectorChunkLength) {
      return [normalized];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length) {
      let end = Math.min(start + this.vectorChunkLength, normalized.length);

      if (end < normalized.length) {
        const slice = normalized.slice(start, end);
        const preferredBreakpoints = [
          slice.lastIndexOf('\n\n'),
          slice.lastIndexOf('\n'),
          slice.lastIndexOf('. '),
          slice.lastIndexOf(' '),
        ].filter((value) => value >= Math.floor(this.vectorChunkLength * 0.6));

        if (preferredBreakpoints.length > 0) {
          end = start + Math.max(...preferredBreakpoints) + 1;
        }
      }

      const chunk = normalized.slice(start, end).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      if (end >= normalized.length) {
        break;
      }

      start = Math.max(end - this.vectorChunkOverlap, start + 1);

      while (start < normalized.length && /\s/.test(normalized[start] ?? '')) {
        start += 1;
      }
    }

    return [...new Set(chunks)];
  }

  private hashVectorContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async embedTexts(
    texts: string[],
    target: AiEmbeddingTarget,
    purpose: AiEmbeddingPurpose,
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const embeddings: number[][] = [];

    for (
      let index = 0;
      index < texts.length;
      index += this.embeddingBatchSize
    ) {
      const batch = texts.slice(index, index + this.embeddingBatchSize);
      const batchEmbeddings =
        target.providerKind === 'gemini'
          ? await this.embedGeminiTexts(batch, target, purpose)
          : await this.embedOpenAiTexts(batch, target);

      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  private async embedOpenAiTexts(
    texts: string[],
    target: AiEmbeddingTarget,
  ): Promise<number[][]> {
    const client = this.createOpenAiClient(target.provider);
    const response = await client.embeddings.create({
      model: target.model.providerModel,
      input: texts,
      encoding_format: 'float',
    });

    return response.data
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  }

  private async embedGeminiTexts(
    texts: string[],
    target: AiEmbeddingTarget,
    purpose: AiEmbeddingPurpose,
  ): Promise<number[][]> {
    const client = this.createGeminiClient(target.provider);
    const model = client.getGenerativeModel({
      model: target.model.providerModel,
    });

    if (texts.length === 1) {
      const response = await model.embedContent(
        this.buildGeminiEmbeddingRequest(texts[0], purpose),
      );

      return [response.embedding.values];
    }

    const response = await model.batchEmbedContents({
      requests: texts.map((text) =>
        this.buildGeminiEmbeddingRequest(text, purpose),
      ),
    });

    return response.embeddings.map((item) => item.values);
  }

  private buildGeminiEmbeddingRequest(
    text: string,
    purpose: AiEmbeddingPurpose,
  ) {
    return {
      content: {
        role: 'user',
        parts: [{ text }],
      },
      taskType:
        purpose === 'query'
          ? TaskType.RETRIEVAL_QUERY
          : TaskType.RETRIEVAL_DOCUMENT,
    };
  }

  private buildVectorDocumentKey(
    row:
      | Pick<
          AiVectorDocumentRow,
          'source_record_handle' | 'source_section' | 'chunk_index'
        >
      | Pick<
          AiVectorDocumentDraft,
          'sourceRecordHandle' | 'sourceSection' | 'chunkIndex'
        >,
  ): string {
    if ('source_record_handle' in row) {
      return `${row.source_record_handle}:${row.source_section}:${row.chunk_index}`;
    }

    return `${row.sourceRecordHandle}:${row.sourceSection}:${row.chunkIndex}`;
  }

  private toVectorLiteral(embedding: number[]): string {
    if (embedding.length === 0) {
      throw new Error('ai.vectorEmbeddingFailed');
    }

    return `[${embedding.map((value) => Number(value).toString()).join(',')}]`;
  }

  private async getVectorIndex(
    entityHandle: string,
  ): Promise<AiVectorIndexRow | null> {
    const rows = (await this.em.getConnection().execute(
      `select "provider_handle", "model_handle", count(*) as "document_count"
       from "ai_vector_document_item"
       where "source_entity_handle" = ?
       group by "provider_handle", "model_handle"
       order by max("updated_at") desc
       limit 1`,
      [entityHandle],
    )) as AiVectorIndexRow[];

    return rows[0] ?? null;
  }

  private async loadVectorSearchRecords(
    entityHandle: string,
    recordHandles: string[],
    user: PersonItem,
  ): Promise<object[]> {
    if (recordHandles.length === 0) {
      return [];
    }

    const result = await this.genericService.findAndCount(
      entityHandle,
      {
        handle: {
          $in: recordHandles.map((handle) =>
            this.coerceVectorRecordHandle(handle),
          ),
        },
      },
      1,
      recordHandles.length,
      {},
      user,
      [
        'status',
        'priority',
        'creatorCompany',
        'creatorPerson',
        'assigneeCompany',
        'assigneePerson',
      ],
    );

    return result.data;
  }

  private coerceVectorRecordHandle(value: string): string | number {
    return /^\d+$/.test(value) ? Number(value) : value;
  }

  private buildVectorExcerpt(content: string, maxLength = 280): string {
    const normalized = content.replace(/\s+/g, ' ').trim();

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private asSimilarityScore(value: number | string): number {
    const numericValue =
      typeof value === 'number' ? value : Number.parseFloat(value);

    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return Math.max(0, Math.min(1, numericValue));
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
    userHandle: number,
  ): Promise<AiChatMessageItem[]> {
    const page = await this.fetchChatMessagePage(sessionHandle, userHandle, {
      limit: this.streamHistoryMessageLimit,
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
      return this.chatMessagePageSize;
    }

    return Math.min(
      this.maxChatMessagePageSize,
      Math.max(1, Math.trunc(limit ?? this.chatMessagePageSize)),
    );
  }

  private normalizeBeforeSequence(beforeSequence?: number): number | undefined {
    if (!Number.isFinite(beforeSequence)) {
      return undefined;
    }

    const normalized = Math.trunc(beforeSequence ?? 0);
    return normalized > 0 ? normalized : undefined;
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
    const requestedFunctionName =
      error instanceof Error && error.message.startsWith('ai.toolNotFound:')
        ? error.message.slice('ai.toolNotFound:'.length)
        : null;

    global.log?.error?.(
      [
        `Gemini tool mode failed for model ${modelName}. Falling back to plain chat.`,
        `Functions: ${functionNames.join(', ')}`,
        ...(requestedFunctionName
          ? [`Requested function: ${requestedFunctionName}`]
          : []),
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

  private alignAssistantContentWithNavigationLinks(
    content: string,
    navigationLinks: AiChatNavigationLink[],
    pageUrl?: string | null,
  ): string {
    if (!content.trim() || navigationLinks.length !== 1) {
      return content;
    }

    const navigationUrl = this.buildAbsoluteNavigationUrl(
      navigationLinks[0].path,
      pageUrl,
    );

    if (!navigationUrl) {
      return content;
    }

    let normalizedContent = content.replace(
      /\]\(((?:https?:\/\/|\/)[^)]+)\)/g,
      (match, rawUrl: string) =>
        this.isLikelySaplingNavigationReference(rawUrl, pageUrl)
          ? `](${navigationUrl})`
          : match,
    );

    normalizedContent = normalizedContent.replace(
      /https?:\/\/[^\s)]+/g,
      (rawUrl) =>
        this.isLikelySaplingNavigationReference(rawUrl, pageUrl)
          ? navigationUrl
          : rawUrl,
    );

    return normalizedContent;
  }

  private buildNavigationLink(
    toolCall: AiExecutedToolCall,
  ): AiChatNavigationLink | null {
    const entityHandle = this.asNonEmptyString(toolCall.arguments.entityHandle);
    const rawResult = this.asRecord(toolCall.rawResult);

    if (toolCall.toolName === 'ticket_search') {
      return {
        path: this.buildEntityTablePath(
          'ticket',
          this.asRecord(rawResult?.appliedFilter),
        ),
        entityHandle: 'ticket',
        kind: 'list',
      };
    }

    if (toolCall.toolName === 'semantic_search') {
      const semanticEntityHandle =
        this.asNonEmptyString(toolCall.arguments.entityHandle) ??
        this.asNonEmptyString(rawResult?.entityHandle) ??
        'ticket';
      const resultHandles = Array.isArray(rawResult?.results)
        ? rawResult.results
            .map((item) => this.asRecord(item)?.handle)
            .filter(
              (value): value is string | number =>
                typeof value === 'string' || typeof value === 'number',
            )
        : [];

      if (resultHandles.length === 0) {
        return null;
      }

      return {
        path: this.buildEntityTablePath(semanticEntityHandle, {
          handle: {
            $in: resultHandles,
          },
        }),
        entityHandle: semanticEntityHandle,
        kind: 'list',
      };
    }

    if (!entityHandle) {
      return null;
    }

    if (rawResult?.found === false) {
      return null;
    }

    if (entityHandle === 'entityRoute') {
      const directRoutePath = this.extractEntityRoutePath(
        toolCall.rawResult,
        toolCall.arguments,
      );

      if (directRoutePath) {
        return {
          path: directRoutePath,
          entityHandle,
          kind: 'route',
        };
      }
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
      toolCall.toolName === 'generic_get' ||
      toolCall.toolName === 'generic_timeline' ||
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

  private buildAbsoluteNavigationUrl(
    path: string,
    pageUrl?: string | null,
  ): string | null {
    if (!path.trim()) {
      return null;
    }

    if (!pageUrl?.trim()) {
      return path;
    }

    try {
      return new URL(path, pageUrl).toString();
    } catch {
      return path;
    }
  }

  private isLikelySaplingNavigationReference(
    rawUrl: string,
    pageUrl?: string | null,
  ): boolean {
    try {
      const currentUrl = pageUrl?.trim() ? new URL(pageUrl) : null;
      const url = rawUrl.startsWith('/')
        ? new URL(rawUrl, currentUrl ?? 'http://localhost')
        : new URL(rawUrl);
      const sameOrigin = currentUrl ? url.origin === currentUrl.origin : false;
      const knownSaplingHost = ['localhost', '127.0.0.1', 'sapling.ai'].includes(
        url.hostname.toLowerCase(),
      );
      const pathLooksInternal =
        url.pathname.startsWith('/table/') ||
        url.pathname.startsWith('/partner/') ||
        url.pathname.startsWith('/dashboard/') ||
        url.pathname.startsWith('/system/') ||
        /\/ticket(\/|$)/.test(url.pathname);

      return pathLooksInternal && (sameOrigin || knownSaplingHost);
    } catch {
      return false;
    }
  }

  private extractEntityRoutePath(
    rawResult: unknown,
    args: Record<string, unknown>,
  ): string | null {
    const resultRecord = this.asRecord(rawResult);
    const directRoute = this.normalizeRoutePath(resultRecord?.route);

    if (directRoute) {
      return directRoute;
    }

    const recordRoute = this.normalizeRoutePath(
      this.asRecord(resultRecord?.record)?.route,
    );

    if (recordRoute) {
      return recordRoute;
    }

    const resultData = Array.isArray(resultRecord?.data)
      ? resultRecord.data
      : [];

    for (const item of resultData) {
      const routePath = this.normalizeRoutePath(this.asRecord(item)?.route);

      if (routePath) {
        return routePath;
      }
    }

    const routeFilter = this.asRecord(args.filter);
    return this.normalizeRoutePath(routeFilter?.route);
  }

  private normalizeRoutePath(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`;
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
      ? ' Use available tools automatically when they are needed to answer with current Sapling data. For questions about the current user identity, profile, company, department, language, or roles, use the current_person tool. If you only know a partial entity name or a field such as email or assigneePerson, use entity_search before entity_schema. For descriptive ticket, incident, Sage error, or known-solution questions across long text fields, use semantic_search with entityHandle ticket first. Semantic search is especially useful for natural-language symptoms, problem descriptions, and workaround requests because it searches vectorized ticket sections such as overview, problem, and solution. Use ticket_search for exact ticket numbers, external numbers, or strict keyword matching. Prefer ticket_search with searchMode solution when the user explicitly asks for an existing fix, workaround, Loesung, or ticket solution and the wording is already keyword-oriented. Do not invent or infer URLs, deep links, record detail links, or absolute Sapling addresses in the prose answer. Only mention a Sapling link when an exact path is provided by tool results; otherwise rely on the UI navigation action instead of fabricating a URL. For questions about where something is located in the app, navigation, or menu, first inspect the entity_catalog to identify likely candidates, then use entity_schema and generic queries on entity, entityGroup, and entityRoute. Treat entity as the page or feature name, entity.group as the navigation group where it is found, entityGroup.parent as an optional parent group for nested navigation, and entityRoute.route as the final route to open. When you identify the sought destination, prefer the matching entityRoute, return the final route at the end of the answer, and use that route for the navigation link instead of only returning a table view. When you already know the exact record handle, prefer generic_get over generic_list. For history, date span, or record activity questions about one known record, use generic_timeline. Before querying or mutating an unfamiliar Sapling entity, inspect its schema first and only use fields and relation names returned by the schema tool.'
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
    const entry = this.resolveToolRegistryEntry(toolRegistry, encodedName);

    if (!entry) {
      throw new Error(`ai.toolNotFound:${encodedName}`);
    }

    return this.mcpService.executeTool(
      entry.descriptor.serverName,
      entry.descriptor.toolName,
      args,
      user,
    );
  }

  private resolveToolRegistryEntry(
    toolRegistry: AiToolRegistryEntry[],
    requestedName: string,
  ): AiToolRegistryEntry | null {
    const normalizedRequestedName =
      this.sanitizeToolFunctionName(requestedName);
    const exactMatch =
      toolRegistry.find(
        (item) =>
          item.encodedName === requestedName ||
          item.encodedName === normalizedRequestedName,
      ) ?? null;

    if (exactMatch) {
      return exactMatch;
    }

    const aliasMatches = toolRegistry.filter((item) => {
      const qualifiedAlias = this.sanitizeToolFunctionName(
        `${item.descriptor.serverName}__${item.descriptor.toolName}`,
      );
      const collapsedQualifiedAlias = this.sanitizeToolFunctionName(
        `${item.descriptor.serverName}_${item.descriptor.toolName}`,
      );
      const rawAlias = this.sanitizeToolFunctionName(item.descriptor.toolName);

      return [qualifiedAlias, collapsedQualifiedAlias, rawAlias].includes(
        normalizedRequestedName,
      );
    });

    if (aliasMatches.length === 1) {
      return aliasMatches[0];
    }

    const saplingMatch =
      aliasMatches.find((item) => item.descriptor.serverName === 'sapling') ??
      null;

    if (saplingMatch) {
      return saplingMatch;
    }

    return null;
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
      supportsEmbeddings: model.supportsEmbeddings,
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
