import { EntityManager } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PersonItem } from '../../entity/PersonItem';
import { TicketItem } from '../../entity/TicketItem';
import { EventItem } from '../../entity/EventItem';
import { SalesOpportunityItem } from '../../entity/SalesOpportunityItem';
import { EffortEstimateItem } from '../../entity/EffortEstimateItem';
import { EffortEstimatePositionItem } from '../../entity/EffortEstimatePositionItem';
import { KnowledgeArticleItem } from '../../entity/KnowledgeArticleItem';
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
  buildPersonLabel,
  buildTicketSectionContent,
  buildTicketVectorMetadata,
  buildVectorDocumentKey,
  buildVectorExcerpt,
  coerceVectorRecordHandle,
  createVectorSectionDocuments,
  getVectorSearchableSections,
  getVectorSearchRelations,
  getVectorSearchUsageHints,
  resolveEmbeddingBatchSize,
  resolveVectorSearchCandidateMultiplier,
  resolveVectorSearchMaxCandidateLimit,
  resolveVectorSearchMaxResults,
  summarizeVectorText,
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
      searchableSections: getVectorSearchableSections(normalizedEntityHandle),
      results,
      usageHints: getVectorSearchUsageHints(normalizedEntityHandle),
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
      case 'event':
        return this.buildEventVectorDocuments(embeddingModel);
      case 'salesOpportunity':
        return this.buildSalesOpportunityVectorDocuments(embeddingModel);
      case 'effortEstimate':
        return this.buildEffortEstimateVectorDocuments(embeddingModel);
      case 'effortEstimatePosition':
        return this.buildEffortEstimatePositionVectorDocuments(embeddingModel);
      case 'knowledgeArticle':
        return this.buildKnowledgeArticleVectorDocuments(embeddingModel);
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
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildTicketSectionContent(ticket, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'problem',
          buildTicketSectionContent(ticket, 'problem'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
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

  private async buildEventVectorDocuments(
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
    const events = await this.em.find(
      EventItem,
      {},
      {
        populate: getVectorSearchRelations('event') as never[],
        orderBy: { updatedAt: 'DESC' },
      },
    );
    const documents: AiVectorDocumentDraft[] = [];

    for (const event of events) {
      if (event.handle == null) {
        continue;
      }

      const sourceRecordHandle = String(event.handle);
      const title = event.title?.trim() || null;
      const metadata = {
        eventHandle: event.handle,
        title,
        status: relationLabel(event.status, 'description'),
        type: relationLabel(event.type, 'description', 'title', 'handle'),
        startDate: formatVectorDate(event.startDate),
        endDate: formatVectorDate(event.endDate),
        assigneeCompany: companyLabel(event.assigneeCompany),
        assigneePerson: personRelationLabel(event.assigneePerson),
        creatorCompany: companyLabel(event.creatorCompany),
        creatorPerson: personRelationLabel(event.creatorPerson),
        ticket: relationLabel(event.ticket, 'number', 'title', 'handle'),
        salesOpportunity: relationLabel(
          event.salesOpportunity,
          'title',
          'handle',
        ),
      };

      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildEventSectionContent(event, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'description',
          buildEventSectionContent(event, 'description'),
          title,
          metadata,
          embeddingModel,
        ),
      );
    }

    return documents;
  }

  private async buildSalesOpportunityVectorDocuments(
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
    const opportunities = await this.em.find(
      SalesOpportunityItem,
      {},
      {
        populate: getVectorSearchRelations('salesOpportunity') as never[],
        orderBy: { updatedAt: 'DESC' },
      },
    );
    const documents: AiVectorDocumentDraft[] = [];

    for (const opportunity of opportunities) {
      if (opportunity.handle == null) {
        continue;
      }

      const sourceRecordHandle = String(opportunity.handle);
      const title = opportunity.title?.trim() || null;
      const metadata = {
        salesOpportunityHandle: opportunity.handle,
        title,
        stage: relationLabel(opportunity.type, 'description', 'handle'),
        forecast: relationLabel(opportunity.forecast, 'description', 'handle'),
        source: relationLabel(opportunity.source, 'description', 'handle'),
        expectedRevenue: opportunity.expectedRevenue ?? null,
        probability: opportunity.probability ?? null,
        closeDate: formatVectorDate(opportunity.closeDate),
        assigneeCompany: companyLabel(opportunity.assigneeCompany),
        assigneePerson: personRelationLabel(opportunity.assigneePerson),
        creatorCompany: companyLabel(opportunity.creatorCompany),
        creatorPerson: personRelationLabel(opportunity.creatorPerson),
      };

      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildSalesOpportunitySectionContent(opportunity, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'description',
          buildSalesOpportunitySectionContent(opportunity, 'description'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'painPoints',
          buildSalesOpportunitySectionContent(opportunity, 'painPoints'),
          title,
          metadata,
          embeddingModel,
        ),
      );
    }

    return documents;
  }

  private async buildEffortEstimateVectorDocuments(
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
    const estimates = await this.em.find(
      EffortEstimateItem,
      {},
      {
        populate: getVectorSearchRelations('effortEstimate') as never[],
        orderBy: { updatedAt: 'DESC' },
      },
    );
    const documents: AiVectorDocumentDraft[] = [];

    for (const estimate of estimates) {
      if (estimate.handle == null) {
        continue;
      }

      const sourceRecordHandle = String(estimate.handle);
      const title = estimate.title?.trim() || null;
      const metadata = {
        effortEstimateHandle: estimate.handle,
        title,
        status: relationLabel(estimate.status, 'description', 'handle'),
        expectedCompletionDate: formatVectorDate(
          estimate.expectedCompletionDate,
        ),
        assigneeCompany: companyLabel(estimate.assigneeCompany),
        assigneePerson: personRelationLabel(estimate.assigneePerson),
        creatorCompany: companyLabel(estimate.creatorCompany),
        creatorPerson: personRelationLabel(estimate.creatorPerson),
        ticket: relationLabel(estimate.ticket, 'number', 'title', 'handle'),
        salesOpportunity: relationLabel(
          estimate.salesOpportunity,
          'title',
          'handle',
        ),
      };

      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildEffortEstimateSectionContent(estimate, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'requirements',
          buildEffortEstimateSectionContent(estimate, 'requirements'),
          title,
          metadata,
          embeddingModel,
        ),
      );
    }

    return documents;
  }

  private async buildEffortEstimatePositionVectorDocuments(
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
    const positions = await this.em.find(
      EffortEstimatePositionItem,
      {},
      {
        populate: getVectorSearchRelations('effortEstimatePosition') as never[],
        orderBy: { updatedAt: 'DESC' },
      },
    );
    const documents: AiVectorDocumentDraft[] = [];

    for (const position of positions) {
      if (position.handle == null) {
        continue;
      }

      const sourceRecordHandle = String(position.handle);
      const title = position.title?.trim() || null;
      const metadata = {
        effortEstimatePositionHandle: position.handle,
        title,
        estimatedHours: position.estimatedHours ?? null,
        isOptional: position.isOptional,
        estimate: relationLabel(position.estimate, 'title', 'handle'),
        template: relationLabel(position.template, 'title', 'handle'),
      };

      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildEffortEstimatePositionSectionContent(position, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'offerText',
          buildEffortEstimatePositionSectionContent(position, 'offerText'),
          title,
          metadata,
          embeddingModel,
        ),
      );
    }

    return documents;
  }

  private async buildKnowledgeArticleVectorDocuments(
    embeddingModel: AiProviderModelItem,
  ): Promise<AiVectorDocumentDraft[]> {
    const articles = await this.em.find(
      KnowledgeArticleItem,
      {},
      {
        populate: getVectorSearchRelations('knowledgeArticle') as never[],
        orderBy: { updatedAt: 'DESC' },
      },
    );
    const documents: AiVectorDocumentDraft[] = [];

    for (const article of articles) {
      if (article.handle == null) {
        continue;
      }

      const sourceRecordHandle = String(article.handle);
      const title = article.title?.trim() || null;
      const metadata = {
        knowledgeArticleHandle: article.handle,
        title,
        status: relationLabel(article.status, 'description', 'handle'),
        visibility: relationLabel(article.visibility, 'description', 'handle'),
        category: relationLabel(article.category, 'title', 'handle'),
        tags: article.tags?.trim() || null,
        publishedAt: formatVectorDate(article.publishedAt),
        validUntil: formatVectorDate(article.validUntil),
        sourceTicket: relationLabel(
          article.sourceTicket,
          'number',
          'title',
          'handle',
        ),
        sourceSalesOpportunity: relationLabel(
          article.sourceSalesOpportunity,
          'title',
          'handle',
        ),
        sourceEffortEstimate: relationLabel(
          article.sourceEffortEstimate,
          'title',
          'handle',
        ),
        authorPerson: personRelationLabel(article.authorPerson),
        reviewerPerson: personRelationLabel(article.reviewerPerson),
      };

      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'overview',
          buildKnowledgeArticleSectionContent(article, 'overview'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'problem',
          buildKnowledgeArticleSectionContent(article, 'problem'),
          title,
          metadata,
          embeddingModel,
        ),
      );
      documents.push(
        ...createVectorSectionDocuments(
          sourceRecordHandle,
          'solution',
          buildKnowledgeArticleSectionContent(article, 'solution'),
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
      getVectorSearchRelations(entityHandle),
    );

    return result.data;
  }
}

function buildEventSectionContent(
  event: EventItem,
  section: 'overview' | 'description',
): string {
  const lines = compactVectorLines([
    `Event: ${event.handle ?? ''}`.trim(),
    event.title?.trim() ? `Title: ${event.title.trim()}` : null,
    vectorLine('Status', relationLabel(event.status, 'description')),
    vectorLine(
      'Type',
      relationLabel(event.type, 'description', 'title', 'handle'),
    ),
    vectorLine('Start', formatVectorDate(event.startDate)),
    vectorLine('End', formatVectorDate(event.endDate)),
    vectorLine('Creator company', companyLabel(event.creatorCompany)),
    vectorLine('Creator person', personRelationLabel(event.creatorPerson)),
    vectorLine('Assignee company', companyLabel(event.assigneeCompany)),
    vectorLine('Assignee person', personRelationLabel(event.assigneePerson)),
    vectorLine(
      'Ticket',
      relationLabel(event.ticket, 'number', 'title', 'handle'),
    ),
    vectorLine(
      'Sales opportunity',
      relationLabel(event.salesOpportunity, 'title', 'handle'),
    ),
  ]);

  if (section === 'overview') {
    lines.push('Section: Overview');
    if (event.description?.trim()) {
      lines.push(
        `Description summary: ${summarizeVectorText(event.description)}`,
      );
    }
    return lines.join('\n');
  }

  if (!event.description?.trim()) {
    return '';
  }

  lines.push('Section: Description');
  lines.push(event.description.trim());
  return lines.join('\n');
}

function buildSalesOpportunitySectionContent(
  opportunity: SalesOpportunityItem,
  section: 'overview' | 'description' | 'painPoints',
): string {
  const lines = compactVectorLines([
    `Sales opportunity: ${opportunity.handle ?? ''}`.trim(),
    opportunity.title?.trim() ? `Title: ${opportunity.title.trim()}` : null,
    vectorLine(
      'Stage',
      relationLabel(opportunity.type, 'description', 'handle'),
    ),
    vectorLine(
      'Forecast',
      relationLabel(opportunity.forecast, 'description', 'handle'),
    ),
    vectorLine(
      'Source',
      relationLabel(opportunity.source, 'description', 'handle'),
    ),
    vectorLine('Expected revenue', opportunity.expectedRevenue),
    vectorLine('Probability', opportunity.probability),
    vectorLine('Close date', formatVectorDate(opportunity.closeDate)),
    opportunity.nextStep?.trim()
      ? `Next step: ${opportunity.nextStep.trim()}`
      : null,
    vectorLine('Creator company', companyLabel(opportunity.creatorCompany)),
    vectorLine(
      'Creator person',
      personRelationLabel(opportunity.creatorPerson),
    ),
    vectorLine('Assignee company', companyLabel(opportunity.assigneeCompany)),
    vectorLine(
      'Assignee person',
      personRelationLabel(opportunity.assigneePerson),
    ),
  ]);

  if (section === 'overview') {
    lines.push('Section: Overview');
    if (opportunity.description?.trim()) {
      lines.push(
        `Description summary: ${summarizeVectorText(opportunity.description)}`,
      );
    }
    if (opportunity.painPoints?.trim()) {
      lines.push(
        `Pain points summary: ${summarizeVectorText(opportunity.painPoints)}`,
      );
    }
    return lines.join('\n');
  }

  const body =
    section === 'description'
      ? (opportunity.description?.trim() ?? '')
      : (opportunity.painPoints?.trim() ?? '');

  if (!body) {
    return '';
  }

  lines.push(
    `Section: ${section === 'description' ? 'Description' : 'Pain points'}`,
  );
  lines.push(body);
  return lines.join('\n');
}

function buildEffortEstimateSectionContent(
  estimate: EffortEstimateItem,
  section: 'overview' | 'requirements',
): string {
  const lines = compactVectorLines([
    `Effort estimate: ${estimate.handle ?? ''}`.trim(),
    estimate.title?.trim() ? `Title: ${estimate.title.trim()}` : null,
    vectorLine(
      'Status',
      relationLabel(estimate.status, 'description', 'handle'),
    ),
    vectorLine(
      'Expected completion',
      formatVectorDate(estimate.expectedCompletionDate),
    ),
    vectorLine('Creator company', companyLabel(estimate.creatorCompany)),
    vectorLine('Creator person', personRelationLabel(estimate.creatorPerson)),
    vectorLine('Assignee company', companyLabel(estimate.assigneeCompany)),
    vectorLine('Assignee person', personRelationLabel(estimate.assigneePerson)),
    vectorLine(
      'Ticket',
      relationLabel(estimate.ticket, 'number', 'title', 'handle'),
    ),
    vectorLine(
      'Sales opportunity',
      relationLabel(estimate.salesOpportunity, 'title', 'handle'),
    ),
  ]);

  if (section === 'overview') {
    lines.push('Section: Overview');
    if (estimate.requirementsMarkdown?.trim()) {
      lines.push(
        `Requirements summary: ${summarizeVectorText(
          estimate.requirementsMarkdown,
        )}`,
      );
    }
    return lines.join('\n');
  }

  if (!estimate.requirementsMarkdown?.trim()) {
    return '';
  }

  lines.push('Section: Requirements');
  lines.push(estimate.requirementsMarkdown.trim());
  return lines.join('\n');
}

function buildEffortEstimatePositionSectionContent(
  position: EffortEstimatePositionItem,
  section: 'overview' | 'offerText',
): string {
  const lines = compactVectorLines([
    `Effort estimate position: ${position.handle ?? ''}`.trim(),
    position.title?.trim() ? `Title: ${position.title.trim()}` : null,
    vectorLine('Estimated hours', position.estimatedHours),
    vectorLine('Optional', position.isOptional ? 'yes' : 'no'),
    vectorLine('Estimate', relationLabel(position.estimate, 'title', 'handle')),
    vectorLine('Template', relationLabel(position.template, 'title', 'handle')),
  ]);

  if (section === 'overview') {
    lines.push('Section: Overview');
    if (position.offerTextMarkdown?.trim()) {
      lines.push(
        `Offer text summary: ${summarizeVectorText(position.offerTextMarkdown)}`,
      );
    }
    return lines.join('\n');
  }

  if (!position.offerTextMarkdown?.trim()) {
    return '';
  }

  lines.push('Section: Offer text');
  lines.push(position.offerTextMarkdown.trim());
  return lines.join('\n');
}

function buildKnowledgeArticleSectionContent(
  article: KnowledgeArticleItem,
  section: 'overview' | 'problem' | 'solution',
): string {
  const lines = compactVectorLines([
    `Knowledge article: ${article.handle ?? ''}`.trim(),
    article.title?.trim() ? `Title: ${article.title.trim()}` : null,
    vectorLine(
      'Status',
      relationLabel(article.status, 'description', 'handle'),
    ),
    vectorLine(
      'Visibility',
      relationLabel(article.visibility, 'description', 'handle'),
    ),
    vectorLine('Category', relationLabel(article.category, 'title', 'handle')),
    article.tags?.trim() ? `Tags: ${article.tags.trim()}` : null,
    vectorLine('Published at', formatVectorDate(article.publishedAt)),
    vectorLine('Valid until', formatVectorDate(article.validUntil)),
    vectorLine(
      'Source ticket',
      relationLabel(article.sourceTicket, 'number', 'title', 'handle'),
    ),
    vectorLine(
      'Source sales opportunity',
      relationLabel(article.sourceSalesOpportunity, 'title', 'handle'),
    ),
    vectorLine(
      'Source effort estimate',
      relationLabel(article.sourceEffortEstimate, 'title', 'handle'),
    ),
    vectorLine('Author', personRelationLabel(article.authorPerson)),
    vectorLine('Reviewer', personRelationLabel(article.reviewerPerson)),
  ]);

  if (section === 'overview') {
    lines.push('Section: Overview');
    if (article.summary?.trim()) {
      lines.push(`Summary: ${summarizeVectorText(article.summary)}`);
    }
    if (article.problemMarkdown?.trim()) {
      lines.push(
        `Problem summary: ${summarizeVectorText(article.problemMarkdown)}`,
      );
    }
    if (article.solutionMarkdown?.trim()) {
      lines.push(
        `Solution summary: ${summarizeVectorText(article.solutionMarkdown)}`,
      );
    }
    return lines.join('\n');
  }

  const body =
    section === 'problem'
      ? (article.problemMarkdown?.trim() ?? '')
      : (article.solutionMarkdown?.trim() ?? '');

  if (!body) {
    return '';
  }

  lines.push(`Section: ${section === 'problem' ? 'Problem' : 'Solution'}`);
  lines.push(body);
  return lines.join('\n');
}

function compactVectorLines(
  lines: Array<string | null | undefined | false>,
): string[] {
  return lines.filter(
    (line): line is string =>
      typeof line === 'string' && line.trim().length > 0,
  );
}

function vectorLine(label: string, value: unknown): string | null {
  const normalized = normalizeVectorValue(value);
  return normalized ? `${label}: ${normalized}` : null;
}

function relationLabel(value: unknown, ...properties: string[]): string | null {
  if (!value || typeof value === 'string') {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  const record = value as Record<string, unknown>;

  for (const property of properties) {
    const normalized = normalizeVectorValue(record[property]);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function companyLabel(value: unknown): string | null {
  return relationLabel(value, 'name', 'title', 'handle');
}

function personRelationLabel(value: unknown): string | null {
  if (!value || typeof value === 'string') {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  const record = value as {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  return (
    buildPersonLabel(record.firstName, record.lastName, record.email) || null
  );
}

function normalizeVectorValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || null;
  }

  return null;
}

function formatVectorDate(value?: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value.trim() || null;
}
