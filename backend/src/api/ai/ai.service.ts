import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/generative-ai';
import { PersonItem } from '../../entity/PersonItem';
import { TicketItem } from '../../entity/TicketItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
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
import { McpService, type McpToolDescriptor } from './mcp.service';
import { DocumentService } from '../document/document.service';
import {
  VectorizeEntityDto,
  VectorizeEntityResponseDto,
} from './dto/vectorization.dto';
import {
  AiChatTranscriptionResponseDto,
  CreateAiChatTranscriptionDto,
} from './dto/transcription.dto';
import { GenericService } from '../generic/generic.service';
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
  hasUsableProviderCredentials,
  resolveProviderKind,
} from './ai-provider.utils';
import {
  alignAssistantContentWithNavigationLinks,
  buildNavigationLinks,
  extractRecordHandle,
} from './ai-navigation.utils';
import { createGeminiClient, embedGeminiTexts } from './gemini-ai.runtime';
import {
  createOpenAiClient,
  embedOpenAiTexts,
  synthesizeOpenAiSpeech,
  transcribeOpenAiAudio,
} from './openai-ai.runtime';
import {
  AiClientTimeContext,
  AiEmbeddingPurpose,
  AiEmbeddingTarget,
  AiSpeechResponseFormat,
  AiSpeechTarget,
  AiExecutedToolCall,
  AiProviderCapability,
  AiPreparedSpeechText,
  AiStreamResult,
  AiToolErrorPayload,
  AiToolRegistryEntry,
  AiVectorDocumentDraft,
  AiVectorDocumentRow,
  AiVectorIndexRow,
} from './ai.types';
import {
  AI_ASSISTANT_SPEECH_INSTRUCTIONS,
  AI_GEMINI_REPEATED_TOOL_CALL_ABORT_MESSAGE,
  AI_GEMINI_TOOL_CALL_LIMIT_MESSAGE,
  buildSystemInstruction,
  buildToolFailureAssistantMessage,
} from './prompts/ai.prompts';
import {
  extractClientTimeContext,
  extractClientTimeContextFromHistory,
} from './ai-client-time.utils';
import {
  buildGeminiFunctionDeclarations,
  buildOpenAiTools,
  buildToolCallSignature,
  buildToolRegistry,
  isToolErrorPayload,
  normalizeFunctionCallArgs,
  parseToolArguments,
  resolveMaxToolCallIterations,
  resolveToolRegistryEntry,
} from './ai-tool-call.utils';
import {
  assertVectorizableEntity,
  asSimilarityScore,
  buildTicketSectionContent,
  buildTicketVectorMetadata,
  buildVectorDocumentKey,
  buildVectorExcerpt,
  coerceVectorRecordHandle,
  createTicketVectorSectionDocuments,
  resolveEmbeddingBatchSize,
  resolveVectorSearchCandidateMultiplier,
  resolveVectorSearchMaxCandidateLimit,
  resolveVectorSearchMaxResults,
  toVectorLiteral,
} from './ai-vector.utils';
import {
  buildAssistantSpeechDescriptor,
  buildTranscriptionResponse,
  extractMessageSpeechPayload,
  extractModelHandle,
  extractProviderHandle,
  sanitizeChatMessage,
  sanitizeChatSession,
  sanitizeModel,
  sanitizeProvider,
  shouldReuseAssistantSpeech,
  withMessageSpeechPayload,
} from './ai-response.utils';

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
    private readonly genericService: GenericService,
  ) {}

  async listActiveProviders(
    capability: AiProviderCapability = 'chat',
    configuredOnly = false,
  ): Promise<AiProviderTypeItem[]> {
    const activeModels = await this.listActiveModels(
      undefined,
      capability,
      configuredOnly,
    );
    const providerHandles = new Set(
      activeModels
        .map((model) => extractProviderHandle(model.provider))
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

    return providers.map((provider) => sanitizeProvider(provider));
  }

  async listActiveModels(
    providerHandle?: string,
    capability: AiProviderCapability = 'chat',
    configuredOnly = false,
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

    const visibleModels = configuredOnly
      ? models.filter(
          (model) =>
            typeof model.provider !== 'string' &&
            hasUsableProviderCredentials(model.provider),
        )
      : models;

    return visibleModels.map((model) => sanitizeModel(model));
  }

  async vectorizeEntity(
    dto: VectorizeEntityDto,
  ): Promise<VectorizeEntityResponseDto> {
    const entityHandle = dto.entityHandle.trim();
    const embeddingTarget = await this.resolveEmbeddingTarget(
      dto.providerHandle,
      dto.modelHandle,
    );
    const documents = await this.buildVectorDocuments(
      entityHandle,
      embeddingTarget.model,
    );
    const connection = this.em.getConnection();
    const existingRows = (await connection.execute(
      `select "handle", "source_record_handle", "source_section", "chunk_index", "title", "content", "content_hash", "metadata", "provider_handle", "model_handle", "embedding_dimensions"
       from "ai_vector_document_item"
       where "source_entity_handle" = ?`,
      [entityHandle],
    )) as AiVectorDocumentRow[];

    const existingByKey = new Map(
      existingRows.map((row) => [buildVectorDocumentKey(row), row]),
    );
    const nextKeys = new Set(
      documents.map((document) => buildVectorDocumentKey(document)),
    );
    const documentsToDelete = existingRows.filter(
      (row) => !nextKeys.has(buildVectorDocumentKey(row)),
    );
    const documentsToEmbed = documents.filter((document) => {
      const existingRow = existingByKey.get(buildVectorDocumentKey(document));

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
        const existingRow = existingByKey.get(buildVectorDocumentKey(document));
        const embedding = embeddings[index] ?? [];
        const vectorLiteral = toVectorLiteral(embedding);
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

    assertVectorizableEntity(normalizedEntityHandle);
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
      Math.max(limit, 1) *
        resolveVectorSearchCandidateMultiplier(embeddingTarget.model),
      resolveVectorSearchMaxCandidateLimit(embeddingTarget.model),
    );
    const vectorLiteral = toVectorLiteral(queryEmbedding ?? []);
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
      const similarity = asSimilarityScore(row.similarity);
      const match = {
        score: similarity,
        section: row.source_section,
        chunkIndex: row.chunk_index,
        title: row.title,
        excerpt: buildVectorExcerpt(row.content),
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
        const recordHandle = extractRecordHandle(record);

        if (recordHandle == null) {
          return null;
        }

        const recordHandleKey = String(recordHandle);
        const groupedResult = groupedRows.get(recordHandleKey);

        if (!groupedResult) {
          return null;
        }

        return {
          handle: coerceVectorRecordHandle(recordHandleKey),
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
      .slice(
        0,
        Math.min(
          Math.max(limit, 1),
          resolveVectorSearchMaxResults(embeddingTarget.model),
        ),
      );

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
      dto.providerHandle ?? extractProviderHandle(session.provider),
      dto.modelHandle ?? extractModelHandle(session.model),
    );
    const availableTools = await this.mcpService.listActiveTools(user);
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
      await this.mcpService.tryExecuteInlineToolCommand(dto.content, user);

    if (inlineToolExecution) {
      const navigationLinks = buildNavigationLinks([
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

      if (runtimeTarget.providerKind === 'openai') {
        streamResult = await this.streamOpenAi(
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
        );
      } else {
        streamResult = await this.streamGemini(
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
        populate: ['provider', 'model', 'model.provider'],
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
        dto.providerHandle ?? extractProviderHandle(session.provider),
        dto.modelHandle ?? extractModelHandle(session.model),
      );
      session.provider = runtimeTarget.provider;
      session.model = runtimeTarget.model;
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
          },
          user,
        );

    const runtimeTarget = await this.resolveRuntimeTarget(
      dto.providerHandle ?? extractProviderHandle(session.provider),
      dto.modelHandle ?? extractModelHandle(session.model),
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
        ? await this.resolveSpeechTarget(
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
        requestedSpeechTarget ?? (await this.resolveSpeechTarget());
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
    return resolveProviderKind(preferredProvider);
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

  private async resolveTranscriptionTarget(
    preferredProviderHandle?: string | null,
    preferredModelHandle?: string | null,
  ): Promise<AiEmbeddingTarget> {
    return this.resolveAiTarget(
      preferredProviderHandle,
      preferredModelHandle,
      'transcription',
    );
  }

  private async resolveSpeechTarget(
    preferredProviderHandle?: string | null,
    preferredModelHandle?: string | null,
  ): Promise<AiSpeechTarget> {
    const target = await this.resolveAiTarget(
      preferredProviderHandle,
      preferredModelHandle,
      'speech',
    );

    if (target.providerKind !== 'openai') {
      throw new Error('ai.speechProviderUnsupported');
    }

    return {
      ...target,
      voice: target.model.speechVoice?.trim() || 'nova',
      speed:
        Number.isFinite(target.model.speechSpeed) &&
        target.model.speechSpeed > 0
          ? target.model.speechSpeed
          : 1,
      mimeType: target.model.speechMimeType?.trim() || 'audio/mpeg',
      fileExtension: this.resolveSpeechResponseFormat(
        target.model.speechFileExtension,
      ),
      maxInputLength:
        Number.isFinite(target.model.speechMaxInputLength) &&
        target.model.speechMaxInputLength > 0
          ? Math.floor(target.model.speechMaxInputLength)
          : 4000,
    };
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
          : capability === 'transcription'
            ? 'ai.transcriptionModelNotFound'
            : capability === 'speech'
              ? 'ai.speechModelNotFound'
              : 'ai.modelNotFound',
      );
    }

    await this.em.populate(model, ['provider']);
    const provider = model.provider;

    if (!hasUsableProviderCredentials(provider)) {
      throw new Error(
        capability === 'embedding'
          ? 'ai.embeddingProviderNotConfigured'
          : capability === 'transcription'
            ? 'ai.transcriptionProviderNotConfigured'
            : capability === 'speech'
              ? 'ai.speechProviderNotConfigured'
              : 'ai.providerNotConfigured',
      );
    }

    return {
      provider,
      model,
      providerKind: this.resolveProvider(provider.handle),
    };
  }

  private buildModelCapabilityFilter(
    capability: AiProviderCapability,
  ): Record<string, boolean> {
    switch (capability) {
      case 'embedding':
        return { supportsEmbeddings: true };
      case 'transcription':
        return { supportsTranscription: true };
      case 'speech':
        return { supportsSpeech: true };
      case 'chat':
      default:
        return { supportsStreaming: true };
    }
  }

  private resolveSpeechResponseFormat(
    fileExtension?: string | null,
  ): AiSpeechResponseFormat {
    switch (fileExtension?.trim().toLowerCase()) {
      case 'wav':
      case 'flac':
      case 'opus':
      case 'pcm':
        return fileExtension.trim().toLowerCase() as AiSpeechResponseFormat;
      case 'mp3':
      default:
        return 'mp3';
    }
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
        hasUsableProviderCredentials(model.provider as AiProviderTypeItem),
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

  private async buildVectorDocuments(
    entityHandle: string,
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
    assertVectorizableEntity(entityHandle);

    switch (entityHandle) {
      case 'ticket':
        return this.buildTicketVectorDocuments(embeddingModel);
      default:
        throw new BadRequestException('ai.vectorizationUnsupportedEntity');
    }
  }

  private async buildTicketVectorDocuments(
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
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
      const metadata = buildTicketVectorMetadata(ticket);

      documents.push(
        ...createTicketVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildTicketSectionContent(ticket, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createTicketVectorSectionDocuments(
          sourceRecordHandle,
          'problem',
          buildTicketSectionContent(ticket, 'problem'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createTicketVectorSectionDocuments(
          sourceRecordHandle,
          'solution',
          buildTicketSectionContent(ticket, 'solution'),
          title,
          metadata,
          embeddingModel,
        ),
      );
    }

    return documents;
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
    const target = await this.resolveTranscriptionTarget(
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
      index += resolveEmbeddingBatchSize(target.model)
    ) {
      const batchSize = resolveEmbeddingBatchSize(target.model);
      const batch = texts.slice(index, index + batchSize);
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
    return embedOpenAiTexts(target.provider, target.model.providerModel, texts);
  }

  private async embedGeminiTexts(
    texts: string[],
    target: AiEmbeddingTarget,
    purpose: AiEmbeddingPurpose,
  ): Promise<number[][]> {
    return embedGeminiTexts({
      provider: target.provider,
      model: target.model.providerModel,
      texts,
      purpose,
    });
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
          $in: recordHandles.map((handle) => coerceVectorRecordHandle(handle)),
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

  private async streamOpenAi(
    history: AiChatMessageItem[],
    provider: AiProviderTypeItem,
    model: string,
    availableTools: McpToolDescriptor[],
    user: PersonItem,
    maxToolCallIterations: number,
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const toolRegistry = buildToolRegistry(availableTools);
    const messages = this.buildOpenAiMessages(history, user, clientTimeContext);
    const executedToolCalls: AiExecutedToolCall[] = [];

    for (let iteration = 0; iteration < maxToolCallIterations; iteration += 1) {
      const response = await createOpenAiClient(
        provider,
      ).chat.completions.create({
        model,
        messages: messages as never,
        ...(toolRegistry.length > 0
          ? {
              tools: buildOpenAiTools(toolRegistry),
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

        const args = parseToolArguments(toolCall.function.arguments);
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
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const toolRegistry = buildToolRegistry(availableTools);
    const conversation = this.buildGeminiConversation(history);
    const currentTurn = conversation.pop();

    if (!currentTurn || currentTurn.role !== 'user') {
      throw new Error('ai.invalidHistory');
    }

    try {
      const functionDeclarations =
        buildGeminiFunctionDeclarations(toolRegistry);

      return await this.streamGeminiWithTools(
        provider,
        modelName,
        conversation,
        currentTurn.parts,
        toolRegistry,
        functionDeclarations,
        user,
        maxToolCallIterations,
        clientTimeContext,
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
        user,
        clientTimeContext,
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
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const generativeModel = createGeminiClient(provider).getGenerativeModel({
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
        user,
        clientTimeContext,
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
        const args = normalizeFunctionCallArgs(functionCall);
        const toolCallSignature = buildToolCallSignature(
          functionCall.name,
          args,
        );
        const repeatedCallCount =
          (repeatedCallCounts.get(toolCallSignature) ?? 0) + 1;

        repeatedCallCounts.set(toolCallSignature, repeatedCallCount);

        if (repeatedCallCount > 2) {
          await onDelta(AI_GEMINI_REPEATED_TOOL_CALL_ABORT_MESSAGE);
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

        if (isToolErrorPayload(toolExecution.rawResult)) {
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
        await onDelta(buildToolFailureAssistantMessage(toolErrors));
        return { toolCalls: executedToolCalls };
      }

      result = await chat.sendMessage(functionResponses);
    }

    await onDelta(AI_GEMINI_TOOL_CALL_LIMIT_MESSAGE);
    return { toolCalls: executedToolCalls };
  }

  private async streamGeminiWithoutTools(
    provider: AiProviderTypeItem,
    modelName: string,
    conversation: Content[],
    currentTurnParts: Part[],
    user: PersonItem,
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<AiStreamResult> {
    const generativeModel = createGeminiClient(provider).getGenerativeModel({
      model: modelName,
      systemInstruction: this.buildSystemInstruction({
        user,
        clientTimeContext,
      }),
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

  private buildOpenAiMessages(
    history: AiChatMessageItem[],
    user?: PersonItem,
    clientTimeContext?: AiClientTimeContext,
  ) {
    const messages: Array<Record<string, unknown>> = [
      {
        role: 'system',
        content: this.buildSystemInstruction({
          includeToolGuidance: true,
          user,
          clientTimeContext:
            clientTimeContext ?? extractClientTimeContextFromHistory(history),
        }),
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
    user?: PersonItem;
    clientTimeContext?: AiClientTimeContext;
  }): string {
    return buildSystemInstruction({
      includeToolGuidance: options?.includeToolGuidance,
      user: options?.user,
      clientTimeContext: options?.clientTimeContext,
      referenceDate: new Date(),
    });
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

  private async executeAutomaticToolCall(
    toolRegistry: AiToolRegistryEntry[],
    encodedName: string,
    args: Record<string, unknown>,
    user: PersonItem,
  ) {
    const entry = resolveToolRegistryEntry(toolRegistry, encodedName);

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
