import { EntityManager } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PersonItem } from '../../entity/PersonItem';
import { TicketItem } from '../../entity/TicketItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import { GenericService } from '../generic/generic.service';
import {
  VectorizeEntityDto,
  VectorizeEntityResponseDto,
} from './dto/vectorization.dto';
import {
  AiEmbeddingPurpose,
  AiEmbeddingTarget,
  AiVectorDocumentDraft,
  AiVectorDocumentRow,
  AiVectorIndexRow,
} from './ai.types';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { embedGeminiTexts } from './gemini-ai.runtime';
import { embedOpenAiTexts } from './openai-ai.runtime';
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
import { extractRecordHandle } from './ai-navigation.utils';

@Injectable()
export class AiVectorService {
  constructor(
    private readonly em: EntityManager,
    private readonly genericService: GenericService,
    private readonly providerRegistry: AiProviderRegistryService,
  ) {}

  async vectorizeEntity(
    dto: VectorizeEntityDto,
  ): Promise<VectorizeEntityResponseDto> {
    const entityHandle = dto.entityHandle.trim();
    const embeddingTarget = await this.providerRegistry.resolveEmbeddingTarget(
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

    const embeddingTarget = await this.providerRegistry.resolveEmbeddingTarget(
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
}
