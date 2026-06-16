import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EntityManager, RequestContext, wrap } from '@mikro-orm/core';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { REDIS_ENABLED } from '../../constants/project.constants';
import { EntityItem } from '../../entity/EntityItem';
import { ExternalRecordLinkItem } from '../../entity/ExternalRecordLinkItem';
import { ImportBatchItem } from '../../entity/ImportBatchItem';
import { ImportBatchRowItem } from '../../entity/ImportBatchRowItem';
import { ImportSourceItem } from '../../entity/ImportSourceItem';
import { ImportTemplateItem } from '../../entity/ImportTemplateItem';
import { ImportTemplateValueMappingItem } from '../../entity/ImportTemplateValueMappingItem';
import { PersonItem } from '../../entity/PersonItem';
import { AiProviderRegistryService } from '../ai/ai-provider-registry.service';
import { createGeminiClient } from '../ai/gemini-ai.runtime';
import { createOpenAiClient } from '../ai/openai-ai.runtime';
import { GenericService } from '../generic/generic.service';
import {
  extractImportHandle,
  getImportErrorMessage,
  normalizeImportRow,
} from '../generic/generic-import.util';
import { GenericQueryService } from '../generic/generic-query.service';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericCustomFieldService } from '../generic/generic-custom-field.service';
import { parseCsvText } from './import-csv.util';
import type {
  ConfigureImportBatchDto,
  ImportAiSuggestDto,
  ImportAiSuggestionDto,
  ImportAiSuggestedExternalKeyDto,
  ImportAiSuggestedFieldMappingDto,
  ImportAiSuggestedReferenceFieldDto,
  ImportAiSuggestedValueMappingDto,
  ImportBatchErrorRowsDto,
  ImportBatchResultSummaryDto,
  ImportBatchRowSummaryDto,
  ImportBatchSourceValuesDto,
  ImportBatchSummaryDto,
  ImportMatchCandidateDto,
  ImportMatchRequestDto,
  ImportMatchResponseDto,
  ImportMatchRowDto,
  ImportFieldDefaultDto,
  ImportFieldMappingDto,
  ImportGenericReferenceMappingDto,
  ImportTemplateSummaryDto,
  ImportRelationMappingDto,
  ImportUniqueConflictStrategyDto,
  ImportUniqueConflictStrategyMode,
  ImportValueMappingDto,
  ImportValueMappingFallback,
  SaveImportTemplateDto,
} from './import.types';

type ExternalKey = {
  hash: string;
  parts: Record<string, unknown>;
};

type ImportPlannedAction = {
  action: string;
  targetReference: string | number | null;
};

type ImportReferenceCandidate = {
  targetField: string;
  referenceName: string;
  values: Array<{
    handle: string | number;
    label: string;
  }>;
};

type ImportAiSuggestionContext = {
  entityHandle: string;
  sourceHandle: string | null;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  fields: Array<Record<string, unknown>>;
  referenceCandidates: ImportReferenceCandidate[];
  templates: ImportTemplateSummaryDto[];
};

type ImportAiSuggestionRaw = {
  mappings?: unknown;
  externalKey?: unknown;
  keyColumns?: unknown;
  referenceFields?: unknown;
  valueMappings?: unknown;
  warnings?: unknown;
};

const SAMPLE_ROW_LIMIT = 5;
const RESPONSE_ROW_LIMIT = 200;
const AI_REFERENCE_CANDIDATE_LIMIT = 50;
const AI_TEMPLATE_CONTEXT_LIMIT = 5;
const REQUIRED_FIELDS_MISSING_MESSAGE_PREFIX = 'import.requiredFieldsMissing';
const INVALID_BOOLEAN_VALUES_MESSAGE_PREFIX = 'import.invalidBooleanValues';
const OPEN_IMPORT_BATCH_STATUSES = [
  'analyzed',
  'validationQueued',
  'validating',
  'validationFailed',
  'validated',
  'validatedWithErrors',
  'executionQueued',
  'executing',
  'executionFailed',
] as const;
const IMPORT_PROGRESS_FLUSH_INTERVAL = 25;
const IMPORT_JOB_NAMES = {
  validate: 'validate-import-batch',
  execute: 'execute-import-batch',
} as const;

@Injectable()
export class ImportService {
  constructor(
    private readonly em: EntityManager,
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly genericService: GenericService,
    private readonly genericQueryService: GenericQueryService,
    private readonly templateService: TemplateService,
    private readonly genericCustomFieldService: GenericCustomFieldService,
    @InjectQueue('imports') private readonly importQueue: Queue,
  ) {}

  async analyzeCsv(
    file: Express.Multer.File | undefined,
    currentUser: PersonItem,
  ): Promise<ImportBatchSummaryDto> {
    if (!file) {
      throw new BadRequestException('import.fileRequired');
    }

    const text = file.buffer.toString('utf8');
    const parsed = parseCsvText(text);

    if (parsed.headers.length === 0) {
      throw new BadRequestException('import.headerRequired');
    }

    const batch = new ImportBatchItem();
    if (currentUser.handle == null) {
      throw new BadRequestException('global.currentUserRequired');
    }

    batch.createdBy = { handle: currentUser.handle } as PersonItem;
    batch.filename = file.originalname;
    batch.mimetype = file.mimetype;
    batch.fileSize = file.size;
    batch.delimiter = parsed.delimiter;
    batch.headers = parsed.headers;
    batch.sampleRows = parsed.rows.slice(0, SAMPLE_ROW_LIMIT);
    batch.rowCount = parsed.rows.length;
    batch.status = 'analyzed';

    this.em.persist(batch);

    parsed.rows.forEach((rawData, index) => {
      const row = new ImportBatchRowItem();
      row.batch = batch;
      row.rowNumber = index + 2;
      row.rawData = rawData;
      row.status = 'pending';
      this.em.persist(row);
    });

    await this.em.flush();
    return this.getBatch(batch.handle ?? 0);
  }

  async getBatch(handle: number): Promise<ImportBatchSummaryDto> {
    const batch = await this.findBatch(handle);
    const rows = await this.em.find(
      ImportBatchRowItem,
      { batch: { handle } },
      { orderBy: { rowNumber: 'ASC' }, limit: RESPONSE_ROW_LIMIT },
    );

    return this.toBatchSummary(batch, rows);
  }

  async getBatchErrorRows(handle: number): Promise<ImportBatchErrorRowsDto> {
    await this.findBatch(handle);
    const rows = await this.em.find(
      ImportBatchRowItem,
      { batch: { handle }, status: { $in: ['error', 'failed'] } },
      { orderBy: { rowNumber: 'ASC' } },
    );

    return { rows: rows.map((row) => this.toBatchRowSummary(row)) };
  }

  async getBatchSourceValues(
    handle: number,
    column: string,
    requestedLimit?: number,
  ): Promise<ImportBatchSourceValuesDto> {
    const batch = await this.findBatch(handle);
    const normalizedColumn = this.normalizeRequiredString(column);
    const headers = this.normalizeColumns(batch.headers ?? []);

    if (!headers.includes(normalizedColumn)) {
      throw new BadRequestException('import.sourceColumnRequired');
    }

    const requestedLimitValue =
      typeof requestedLimit === 'number' && Number.isFinite(requestedLimit)
        ? requestedLimit
        : 100;
    const limit = Math.min(Math.max(Math.trunc(requestedLimitValue), 1), 100);
    const rows = (await this.em.getConnection().execute(
      `
        select value
        from (
          select distinct nullif(btrim(raw_data ->> ?), '') as value
          from import_batch_row_item
          where batch_handle = ?
        ) source_values
        where value is not null
        order by value asc
        limit ?
      `,
      [normalizedColumn, batch.handle, limit + 1],
    )) as Array<{ value: string }>;

    return {
      values: rows.slice(0, limit).map((row) => row.value),
      isTruncated: rows.length > limit,
    };
  }

  async matchBatchExistingRecords(
    handle: number,
    dto: ImportMatchRequestDto,
    currentUser: PersonItem,
  ): Promise<ImportMatchResponseDto> {
    const entityHandle = this.normalizeRequiredString(dto.entityHandle);
    const batch = await this.findBatch(handle);
    const sourceColumns = this.resolveMatchSourceColumns(
      batch,
      dto.sourceColumns,
    );
    const targetFields = this.resolveMatchTargetFields(
      entityHandle,
      dto.targetFields,
    );

    if (targetFields.length === 0) {
      throw new BadRequestException('import.matchNoSearchableFields');
    }

    const sampleLimit = Math.min(
      Math.max(Math.trunc(dto.sampleLimit ?? 25), 1),
      100,
    );
    const limitPerValue = Math.min(
      Math.max(Math.trunc(dto.limitPerValue ?? 3), 1),
      10,
    );
    const rows = await this.em.find(
      ImportBatchRowItem,
      { batch: { handle: batch.handle } },
      { orderBy: { rowNumber: 'ASC' }, limit: sampleLimit },
    );
    const responseRows: ImportMatchRowDto[] = [];

    for (const row of rows) {
      const linkedReference = await this.resolveRowExternalLinkReference(
        batch,
        row,
      );

      if (linkedReference) {
        responseRows.push({
          rowNumber: row.rowNumber,
          recommendedAction: 'update' as const,
          confidence: 1,
          matchedReference: linkedReference,
          candidates: [
            {
              reference: linkedReference,
              displayValue: linkedReference,
              confidence: 1,
              reason: 'import.matchExternalKey',
            },
          ],
          reason: 'import.matchExternalKey',
          blockingIssues: [],
        });
        continue;
      }

      const candidates = await this.findMatchCandidatesForRow(
        entityHandle,
        row,
        sourceColumns,
        targetFields,
        limitPerValue,
        currentUser,
      );

      if (candidates.length === 0) {
        responseRows.push({
          rowNumber: row.rowNumber,
          recommendedAction: 'create' as const,
          confidence: 0.7,
          matchedReference: null,
          candidates: [],
          reason: 'import.matchNoExistingRecord',
          blockingIssues: [],
        });
        continue;
      }

      if (candidates.length === 1 && candidates[0].confidence >= 0.85) {
        responseRows.push({
          rowNumber: row.rowNumber,
          recommendedAction: 'update' as const,
          confidence: candidates[0].confidence,
          matchedReference: candidates[0].reference,
          candidates,
          reason: candidates[0].reason,
          blockingIssues: [],
        });
        continue;
      }

      responseRows.push({
        rowNumber: row.rowNumber,
        recommendedAction: 'ambiguous' as const,
        confidence: Math.max(
          ...candidates.map((candidate) => candidate.confidence),
        ),
        matchedReference: null,
        candidates,
        reason: 'import.matchAmbiguous',
        blockingIssues: ['import.matchAmbiguous'],
      });
    }

    return {
      batchHandle: handle,
      entityHandle,
      sampledRows: rows.length,
      rows: responseRows,
    };
  }

  async listOpenBatches(): Promise<ImportBatchSummaryDto[]> {
    const batches = await this.em.find(
      ImportBatchItem,
      {
        status: { $in: [...OPEN_IMPORT_BATCH_STATUSES] },
        executedAt: null,
      },
      {
        populate: ['source', 'targetEntity', 'importTemplate', 'createdBy'],
        orderBy: { updatedAt: 'DESC' },
        limit: 100,
      },
    );

    return batches.map((batch) => this.toBatchSummary(batch, []));
  }

  async configureBatch(
    handle: number,
    dto: ConfigureImportBatchDto,
    currentUser: PersonItem,
  ): Promise<ImportBatchSummaryDto> {
    if (currentUser.handle == null) {
      throw new BadRequestException('global.currentUserRequired');
    }

    const entityHandle = this.normalizeRequiredString(dto.entityHandle);
    const batch = await this.findBatch(handle);

    if (this.isImportBatchBusy(batch.status)) {
      throw new BadRequestException('import.batchJobAlreadyRunning');
    }

    const targetEntity = await this.em.findOne(EntityItem, {
      handle: entityHandle,
    });

    if (!targetEntity) {
      throw new NotFoundException('global.entityNotFound');
    }

    const sourceHandle = this.normalizeOptionalString(dto.sourceHandle);
    const source = sourceHandle
      ? await this.em.findOne(ImportSourceItem, { handle: sourceHandle })
      : null;

    if (sourceHandle && !source) {
      throw new NotFoundException('import.sourceNotFound');
    }

    const keyColumns = this.normalizeColumns(dto.keyColumns ?? []);
    if (keyColumns.length > 0 && !source) {
      throw new BadRequestException('import.sourceRequiredForExternalKey');
    }

    const templateHandle =
      typeof dto.templateHandle === 'number' &&
      Number.isFinite(dto.templateHandle)
        ? Math.trunc(dto.templateHandle)
        : null;
    const importTemplate = templateHandle
      ? await this.em.findOne(
          ImportTemplateItem,
          {
            handle: templateHandle,
            ...(source ? { source: { handle: source.handle } } : {}),
            targetEntity: { handle: entityHandle },
          },
          { populate: ['valueMappings'] },
        )
      : null;

    if (templateHandle && !importTemplate) {
      throw new NotFoundException('import.templateNotFound');
    }

    const valueMappings = importTemplate
      ? this.mergeValueMappings(
          this.getTemplateConfiguredValueMappings(importTemplate),
          dto.valueMappings ?? [],
        )
      : (dto.valueMappings ?? []);
    const effectiveDto: ConfigureImportBatchDto = {
      ...dto,
      valueMappings,
    };

    batch.targetEntity = targetEntity;
    batch.source = source;
    batch.importTemplate = importTemplate;
    batch.mapping = {
      mappings: effectiveDto.mappings ?? [],
      fieldDefaults: effectiveDto.fieldDefaults ?? [],
      relationMappings: effectiveDto.relationMappings ?? [],
      valueMappings: effectiveDto.valueMappings ?? [],
      uniqueConflictStrategies: effectiveDto.uniqueConflictStrategies ?? [],
    };
    batch.externalKeyColumns = keyColumns;
    batch.genericReferenceMapping = dto.genericReferenceMapping ?? null;
    batch.status = 'validationQueued';
    batch.currentOperation = 'validation';
    batch.processedCount = 0;
    batch.readyCount = 0;
    batch.errorCount = 0;
    batch.createdCount = 0;
    batch.updatedCount = 0;
    batch.skippedCount = 0;
    batch.failedCount = 0;
    batch.jobId = null;
    batch.startedAt = null;
    batch.completedAt = null;
    batch.failedAt = null;
    batch.executedAt = undefined;
    batch.lastError = null;
    await this.em.flush();

    await this.enqueueImportJob(
      IMPORT_JOB_NAMES.validate,
      handle,
      currentUser.handle,
    );
    return this.getBatch(handle);
  }

  async listTemplates(
    entityHandle?: string,
    sourceHandle?: string,
  ): Promise<ImportTemplateSummaryDto[]> {
    const filter: Record<string, unknown> = { isActive: true };
    const normalizedEntityHandle = this.normalizeOptionalString(entityHandle);
    const normalizedSourceHandle = this.normalizeOptionalString(sourceHandle);

    if (normalizedEntityHandle) {
      filter.targetEntity = { handle: normalizedEntityHandle };
    }

    if (normalizedSourceHandle) {
      filter.source = { handle: normalizedSourceHandle };
    }

    const templates = await this.em.find(ImportTemplateItem, filter, {
      populate: ['source', 'targetEntity', 'valueMappings'],
      orderBy: { title: 'ASC' },
    });

    return templates.map((template) => this.toTemplateSummary(template));
  }

  async createTemplate(
    dto: SaveImportTemplateDto,
  ): Promise<ImportTemplateSummaryDto> {
    if (dto.handle != null) {
      throw new BadRequestException('exception.badRequest');
    }

    return this.saveTemplate(dto, null);
  }

  async updateTemplate(
    handle: number,
    dto: SaveImportTemplateDto,
  ): Promise<ImportTemplateSummaryDto> {
    if (!Number.isFinite(handle)) {
      throw new BadRequestException('exception.badRequest');
    }

    return this.saveTemplate(dto, Math.trunc(handle));
  }

  private async saveTemplate(
    dto: SaveImportTemplateDto,
    handle: number | null,
  ): Promise<ImportTemplateSummaryDto> {
    const title = this.normalizeRequiredString(dto.title);
    const entityHandle = this.normalizeRequiredString(dto.entityHandle);
    const sourceHandle = this.normalizeRequiredString(dto.sourceHandle);
    const targetEntity = await this.em.findOne(EntityItem, {
      handle: entityHandle,
    });
    const source = await this.em.findOne(ImportSourceItem, {
      handle: sourceHandle,
    });

    if (!targetEntity) {
      throw new NotFoundException('global.entityNotFound');
    }

    if (!source) {
      throw new NotFoundException('import.sourceNotFound');
    }

    const existingByTitle = await this.em.findOne(ImportTemplateItem, {
      source: { handle: sourceHandle },
      targetEntity: { handle: entityHandle },
      title,
    });
    if (
      existingByTitle &&
      (handle == null || existingByTitle.handle !== handle)
    ) {
      throw new ConflictException('import.templateAlreadyExists');
    }

    const template = handle
      ? await this.em.findOne(
          ImportTemplateItem,
          { handle },
          { populate: ['source', 'targetEntity', 'valueMappings'] },
        )
      : new ImportTemplateItem();

    if (!template) {
      throw new NotFoundException('import.templateNotFound');
    }

    if (!handle) {
      await this.resetSerialSequence('import_template_item', 'handle');
      this.em.persist(template);
    }

    template.title = title;
    template.description =
      this.normalizeOptionalString(dto.description) ?? undefined;
    template.source = source;
    template.targetEntity = targetEntity;
    template.isActive = dto.isActive ?? true;
    template.mapping = {
      mappings: dto.mappings ?? [],
      fieldDefaults: dto.fieldDefaults ?? [],
      relationMappings: dto.relationMappings ?? [],
      uniqueConflictStrategies: dto.uniqueConflictStrategies ?? [],
    };
    template.externalKeyColumns = this.normalizeColumns(dto.keyColumns ?? []);
    template.genericReferenceMapping = dto.genericReferenceMapping ?? null;
    await this.syncTemplateValueMappings(template, dto.valueMappings ?? []);

    await this.em.flush();
    await this.em.populate(
      template,
      ['source', 'targetEntity', 'valueMappings'],
      {
        refresh: true,
      },
    );
    return this.toTemplateSummary(template);
  }

  async suggestBatchConfiguration(
    handle: number,
    dto: ImportAiSuggestDto = {},
  ): Promise<ImportAiSuggestionDto> {
    const batch = await this.findBatch(handle);
    const entityHandle =
      this.normalizeOptionalString(dto.entityHandle) ??
      this.extractHandle(batch.targetEntity);

    if (!entityHandle) {
      throw new BadRequestException('import.targetEntityRequired');
    }

    const targetEntity = await this.em.findOne(EntityItem, {
      handle: entityHandle,
    });

    if (!targetEntity) {
      throw new NotFoundException('global.entityNotFound');
    }

    const sourceHandle =
      this.normalizeOptionalString(dto.sourceHandle) ??
      this.extractHandle(batch.source);
    if (sourceHandle) {
      const source = await this.em.findOne(ImportSourceItem, {
        handle: sourceHandle,
      });

      if (!source) {
        throw new NotFoundException('import.sourceNotFound');
      }
    }

    const headers = this.normalizeColumns(batch.headers ?? []);
    if (headers.length === 0) {
      throw new BadRequestException('import.headerRequired');
    }

    const template =
      await this.genericCustomFieldService.appendCustomFieldTemplates(
        entityHandle,
        this.templateService.getEntityTemplate(entityHandle),
      );
    const importableFields = this.getImportableFields(template);
    const sampleRows = this.limitAiSampleRows(
      batch.sampleRows ?? [],
      dto.maxSampleRows,
    );
    const templates = (
      await this.listTemplates(entityHandle, sourceHandle ?? undefined)
    ).slice(0, AI_TEMPLATE_CONTEXT_LIMIT);
    const referenceCandidates =
      await this.buildImportReferenceCandidates(importableFields);
    const context: ImportAiSuggestionContext = {
      entityHandle,
      sourceHandle: sourceHandle ?? null,
      headers,
      sampleRows,
      fields: importableFields.map((field) => ({
        name: field.name,
        type: field.type,
        kind: field.kind ?? null,
        isRequired: field.isRequired,
        isReference: field.isReference,
        referenceName: field.referenceName || null,
        options: field.options ?? [],
        genericReference: field.genericReference ?? null,
      })),
      referenceCandidates,
      templates,
    };
    const generation = await this.generateImportAiSuggestion(context, dto);
    const suggestion = this.normalizeImportAiSuggestion(
      generation.raw,
      context,
    );

    return {
      ...suggestion,
      providerHandle: generation.providerHandle,
      modelHandle: generation.modelHandle,
    };
  }

  async executeBatch(
    handle: number,
    currentUser: PersonItem,
  ): Promise<ImportBatchSummaryDto> {
    if (currentUser.handle == null) {
      throw new BadRequestException('global.currentUserRequired');
    }

    const batch = await this.findBatch(handle);
    const entityHandle = this.extractHandle(batch.targetEntity);

    if (!entityHandle) {
      throw new BadRequestException('import.targetEntityRequired');
    }

    if (this.isImportBatchBusy(batch.status)) {
      throw new BadRequestException('import.batchJobAlreadyRunning');
    }

    if (
      batch.status !== 'validated' &&
      batch.status !== 'validatedWithErrors'
    ) {
      throw new BadRequestException('import.batchNotReadyForExecution');
    }

    if ((batch.readyCount ?? 0) <= 0) {
      throw new BadRequestException('import.noReadyRows');
    }

    batch.status = 'executionQueued';
    batch.currentOperation = 'execution';
    batch.processedCount = 0;
    batch.createdCount = 0;
    batch.updatedCount = 0;
    batch.skippedCount = 0;
    batch.failedCount = 0;
    batch.jobId = null;
    batch.startedAt = null;
    batch.completedAt = null;
    batch.failedAt = null;
    batch.lastError = null;
    await this.em.flush();

    await this.enqueueImportJob(
      IMPORT_JOB_NAMES.execute,
      handle,
      currentUser.handle,
    );
    return this.getBatch(handle);
  }

  async processQueuedValidation(
    handle: number,
    userHandle: number,
  ): Promise<void> {
    await this.runInImportContext(async () => {
      const batch = await this.tryFindBatch(handle);
      if (!batch) {
        return;
      }

      if (
        batch.status !== 'validationQueued' &&
        batch.status !== 'validating'
      ) {
        return;
      }

      try {
        const currentUser = await this.findImportUser(userHandle);
        const entityHandle = this.extractHandle(batch.targetEntity);
        if (!entityHandle) {
          throw new BadRequestException('import.targetEntityRequired');
        }

        const sourceHandle = this.extractHandle(batch.source);
        const source = sourceHandle
          ? ({ handle: sourceHandle } as ImportSourceItem)
          : null;
        const keyColumns = this.normalizeColumns(
          batch.externalKeyColumns ?? [],
        );
        const effectiveDto = this.createConfigureDtoFromBatch(batch);
        const rows = await this.em.find(
          ImportBatchRowItem,
          { batch: { handle: batch.handle } },
          { orderBy: { rowNumber: 'ASC' } },
        );
        const template =
          await this.genericCustomFieldService.appendCustomFieldTemplates(
            entityHandle,
            this.templateService.getEntityTemplate(entityHandle),
          );
        const duplicateKeys = new Set<string>();
        const uniqueValueClaims = new Map<string, number>();
        let readyCount = 0;
        let errorCount = 0;

        batch.status = 'validating';
        batch.currentOperation = 'validation';
        batch.processedCount = 0;
        batch.readyCount = 0;
        batch.errorCount = 0;
        batch.startedAt = new Date();
        batch.completedAt = null;
        batch.failedAt = null;
        batch.lastError = null;
        await this.em.flush();

        for (const row of rows) {
          try {
            const externalKey =
              source && keyColumns.length > 0
                ? this.buildExternalKey(
                    source.handle,
                    entityHandle,
                    keyColumns,
                    row.rawData,
                  )
                : null;

            if (externalKey) {
              if (duplicateKeys.has(externalKey.hash)) {
                throw new BadRequestException(
                  'import.duplicateExternalKeyInBatch',
                );
              }
              duplicateKeys.add(externalKey.hash);
            }

            const payload = await this.buildPayload(
              template,
              row.rawData,
              effectiveDto,
              entityHandle,
              currentUser,
            );
            this.validateImportDateValues(template, payload);
            this.validateImportBooleanValues(template, payload);
            const plannedAction = await this.resolvePlannedAction(
              entityHandle,
              payload,
              source?.handle ?? null,
              externalKey?.hash ?? null,
            );
            await this.applyUniqueConflictStrategies(
              template,
              payload,
              effectiveDto,
              entityHandle,
              row,
              plannedAction.targetReference,
              externalKey,
              uniqueValueClaims,
            );

            const missingRequiredFields = this.getMissingRequiredFieldNames(
              template,
              payload,
              plannedAction.action,
            );
            if (plannedAction.action !== 'updated') {
              missingRequiredFields.push(
                ...(await this.genericCustomFieldService.getMissingRequiredFieldNames(
                  entityHandle,
                  this.normalizeRecord(payload.customFields) ?? {},
                )),
              );
            }

            if (missingRequiredFields.length > 0) {
              throw new Error(
                this.createRequiredFieldsMissingMessage(missingRequiredFields),
              );
            }

            row.payload = payload;
            row.externalKeyHash = externalKey?.hash ?? null;
            row.externalKeyParts = externalKey?.parts ?? null;
            row.action = plannedAction.action;
            row.status = 'ready';
            row.message = null;
            readyCount += 1;
          } catch (error) {
            row.payload = null;
            row.externalKeyHash = null;
            row.externalKeyParts = null;
            row.action = null;
            row.status = 'error';
            row.message = getImportErrorMessage(error);
            errorCount += 1;
          }

          batch.processedCount += 1;
          batch.readyCount = readyCount;
          batch.errorCount = errorCount;
          if (batch.processedCount % IMPORT_PROGRESS_FLUSH_INTERVAL === 0) {
            await this.em.flush();
          }
        }

        batch.readyCount = readyCount;
        batch.errorCount = errorCount;
        batch.status = errorCount > 0 ? 'validatedWithErrors' : 'validated';
        batch.currentOperation = null;
        batch.completedAt = new Date();
        await this.em.flush();
      } catch (error) {
        await this.markBatchJobFailed(
          handle,
          'validationFailed',
          'validation',
          error,
        );
        throw error;
      }
    });
  }

  async processQueuedExecution(
    handle: number,
    userHandle: number,
  ): Promise<void> {
    await this.runInImportContext(async () => {
      const batch = await this.tryFindBatch(handle);
      if (!batch) {
        return;
      }

      if (batch.status !== 'executionQueued' && batch.status !== 'executing') {
        return;
      }

      try {
        const currentUser = await this.findImportUser(userHandle);
        const entityHandle = this.extractHandle(batch.targetEntity);
        if (!entityHandle) {
          throw new BadRequestException('import.targetEntityRequired');
        }

        const rows = await this.em.find(
          ImportBatchRowItem,
          { batch: { handle: batch.handle } },
          { orderBy: { rowNumber: 'ASC' } },
        );

        batch.status = 'executing';
        batch.currentOperation = 'execution';
        batch.processedCount = 0;
        batch.createdCount = 0;
        batch.updatedCount = 0;
        batch.skippedCount = 0;
        batch.failedCount = 0;
        batch.startedAt = new Date();
        batch.completedAt = null;
        batch.failedAt = null;
        batch.lastError = null;
        await this.em.flush();

        for (const row of rows) {
          if (row.status !== 'ready' || !row.payload) {
            if (row.status !== 'error') {
              row.status = 'skipped';
              row.action = 'skipped';
              batch.skippedCount += 1;
            }
            batch.processedCount += 1;
            if (batch.processedCount % IMPORT_PROGRESS_FLUSH_INTERVAL === 0) {
              await this.em.flush();
            }
            continue;
          }

          try {
            const link = await this.findRowExternalLink(batch, row);
            const handleToUpdate =
              link?.reference ?? extractImportHandle(row.payload);
            const result =
              handleToUpdate == null
                ? await this.genericService.create(
                    entityHandle,
                    row.payload,
                    currentUser,
                  )
                : await this.genericService.update(
                    entityHandle,
                    handleToUpdate,
                    row.payload,
                    currentUser,
                    [],
                    {},
                    { resolution: 'overwrite' },
                  );
            const targetReference = this.extractResultHandle(result);
            const action = handleToUpdate == null ? 'created' : 'updated';

            row.status = 'executed';
            row.action = action;
            row.targetReference =
              targetReference == null ? null : String(targetReference);
            row.message = null;

            if (action === 'created') {
              batch.createdCount += 1;
            } else {
              batch.updatedCount += 1;
            }

            await this.upsertExternalLink(batch, row);
          } catch (error) {
            row.status = 'failed';
            row.action = 'failed';
            row.message = getImportErrorMessage(error);
            batch.failedCount += 1;
          }

          batch.processedCount += 1;
          if (batch.processedCount % IMPORT_PROGRESS_FLUSH_INTERVAL === 0) {
            await this.em.flush();
          }
        }

        batch.executedAt = new Date();
        batch.status =
          batch.failedCount > 0 ? 'executedWithErrors' : 'executed';
        batch.currentOperation = null;
        batch.completedAt = new Date();
        await this.em.flush();
      } catch (error) {
        await this.markBatchJobFailed(
          handle,
          'executionFailed',
          'execution',
          error,
        );
        throw error;
      }
    });
  }

  private async generateImportAiSuggestion(
    context: ImportAiSuggestionContext,
    dto: ImportAiSuggestDto,
  ): Promise<{
    raw: ImportAiSuggestionRaw;
    providerHandle: string | null;
    modelHandle: string | null;
  }> {
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      dto.providerHandle ?? null,
      dto.modelHandle ?? null,
    );
    const systemPrompt = this.buildImportAiSuggestionSystemPrompt();
    const userPrompt = this.buildImportAiSuggestionUserPrompt(context);
    const rawText =
      runtimeTarget.providerKind === 'gemini'
        ? await this.generateGeminiSuggestionText(
            runtimeTarget.provider,
            runtimeTarget.model.providerModel,
            systemPrompt,
            userPrompt,
          )
        : await this.generateOpenAiSuggestionText(
            runtimeTarget.provider,
            runtimeTarget.model.providerModel,
            systemPrompt,
            userPrompt,
          );

    return {
      raw: this.parseJsonObject(rawText),
      providerHandle: runtimeTarget.provider.handle ?? null,
      modelHandle: runtimeTarget.model.handle ?? null,
    };
  }

  private async generateOpenAiSuggestionText(
    provider: Parameters<typeof createOpenAiClient>[0],
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await createOpenAiClient(provider).chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
    );

    return response.choices[0]?.message?.content ?? '';
  }

  private async generateGeminiSuggestionText(
    provider: Parameters<typeof createGeminiClient>[0],
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const model = createGeminiClient(provider).getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);

    return result.response.text();
  }

  private buildImportAiSuggestionSystemPrompt(): string {
    return [
      'You suggest import configurations for Sapling CSV initial imports.',
      'Return exactly one valid JSON object and no markdown fences.',
      'Use only CSV headers and Sapling field names provided in the context.',
      'Prefer high-confidence exact or semantic matches; omit uncertain mappings.',
      'External key columns may contain one or many CSV headers.',
      'Only suggest reference value mappings when the target handle or label is unambiguous in referenceCandidates.',
      'Only auto-map obvious scalar values such as yes/no to booleans or active/inactive to matching target values.',
      'Use this JSON shape: {"mappings":[{"sourceColumn":"CSV header","targetField":"saplingField","confidence":0.0,"reason":"short reason"}],"externalKey":{"columns":["CSV header"],"confidence":0.0,"reason":"short reason"},"referenceFields":[{"targetField":"saplingField","referenceName":"entityHandle","sourceColumn":"CSV header","confidence":0.0,"reason":"short reason"}],"valueMappings":[{"targetField":"saplingField","values":{"source value":"target value or boolean"},"fallback":"keep","confidence":0.0,"reason":"short reason"}],"warnings":["short warning"]}.',
    ].join('\n');
  }

  private buildImportAiSuggestionUserPrompt(
    context: ImportAiSuggestionContext,
  ): string {
    return [
      `Target entity: ${context.entityHandle}`,
      `Source system: ${context.sourceHandle ?? 'none'}`,
      '',
      'Import context JSON:',
      JSON.stringify(
        {
          headers: context.headers,
          sampleRows: context.sampleRows,
          fields: context.fields,
          referenceCandidates: context.referenceCandidates,
          existingTemplates: context.templates.map((template) => ({
            title: template.title,
            externalKeyColumns: template.externalKeyColumns ?? [],
            genericReferenceMapping: template.genericReferenceMapping ?? null,
            mapping: template.mapping ?? null,
          })),
        },
        null,
        2,
      ),
    ].join('\n');
  }

  private normalizeImportAiSuggestion(
    rawSuggestion: ImportAiSuggestionRaw,
    context: ImportAiSuggestionContext,
  ): ImportAiSuggestionDto {
    const headerSet = new Set(context.headers);
    const fieldSet = new Set(context.fields.map((field) => String(field.name)));
    const referenceFieldMap = new Map(
      context.referenceCandidates.map((candidate) => [
        candidate.targetField,
        candidate,
      ]),
    );
    const mappings: ImportAiSuggestedFieldMappingDto[] = [];
    const mappedTargets = new Set<string>();

    for (const entry of this.toRecordArray(rawSuggestion.mappings)) {
      const sourceColumn = this.normalizeOptionalString(entry.sourceColumn);
      const targetField = this.normalizeOptionalString(entry.targetField);
      if (
        !sourceColumn ||
        !targetField ||
        !headerSet.has(sourceColumn) ||
        !fieldSet.has(targetField) ||
        mappedTargets.has(targetField)
      ) {
        continue;
      }

      mappings.push({
        sourceColumn,
        targetField,
        confidence: this.normalizeConfidence(entry.confidence),
        reason: this.normalizeOptionalString(entry.reason),
      });
      mappedTargets.add(targetField);
    }

    const externalKey = this.normalizeSuggestedExternalKey(
      rawSuggestion.externalKey ?? rawSuggestion.keyColumns,
      context.headers,
    );
    const referenceFields = this.normalizeSuggestedReferenceFields(
      rawSuggestion.referenceFields,
      headerSet,
      referenceFieldMap,
    );
    const valueMappings = this.normalizeSuggestedValueMappings(
      rawSuggestion.valueMappings,
      mappings,
      referenceFieldMap,
    );
    const warnings = this.toStringArray(rawSuggestion.warnings).slice(0, 8);

    return {
      mappings,
      externalKey,
      referenceFields,
      valueMappings,
      warnings,
    };
  }

  private normalizeSuggestedExternalKey(
    value: unknown,
    headers: string[],
  ): ImportAiSuggestedExternalKeyDto | null {
    const headerSet = new Set(headers);
    const record = this.normalizeRecord(value);
    const rawColumns = record
      ? record.columns
      : Array.isArray(value)
        ? value
        : null;
    const columns = this.normalizeColumns(
      this.toStringArray(rawColumns).filter((column) => headerSet.has(column)),
    );

    if (columns.length === 0) {
      return null;
    }

    return {
      columns,
      confidence: this.normalizeConfidence(record?.confidence),
      reason: this.normalizeOptionalString(record?.reason),
    };
  }

  private normalizeSuggestedReferenceFields(
    value: unknown,
    headerSet: Set<string>,
    referenceFieldMap: Map<string, ImportReferenceCandidate>,
  ): ImportAiSuggestedReferenceFieldDto[] {
    const referenceFields: ImportAiSuggestedReferenceFieldDto[] = [];

    for (const entry of this.toRecordArray(value)) {
      const targetField = this.normalizeOptionalString(entry.targetField);
      if (!targetField || !referenceFieldMap.has(targetField)) {
        continue;
      }

      const candidate = referenceFieldMap.get(targetField);
      const sourceColumn = this.normalizeOptionalString(entry.sourceColumn);
      referenceFields.push({
        targetField,
        referenceName:
          this.normalizeOptionalString(entry.referenceName) ??
          candidate?.referenceName ??
          '',
        sourceColumn:
          sourceColumn && headerSet.has(sourceColumn) ? sourceColumn : null,
        confidence: this.normalizeConfidence(entry.confidence),
        reason: this.normalizeOptionalString(entry.reason),
      });
    }

    return referenceFields;
  }

  private normalizeSuggestedValueMappings(
    value: unknown,
    mappings: ImportAiSuggestedFieldMappingDto[],
    referenceFieldMap: Map<string, ImportReferenceCandidate>,
  ): ImportAiSuggestedValueMappingDto[] {
    const mappedTargets = new Set(
      mappings.map((mapping) => mapping.targetField),
    );
    const valueMappings: ImportAiSuggestedValueMappingDto[] = [];

    for (const entry of this.toRecordArray(value)) {
      const targetField = this.normalizeOptionalString(entry.targetField);
      const rawValues = this.normalizeRecord(entry.values);
      if (!targetField || !rawValues || !mappedTargets.has(targetField)) {
        continue;
      }

      const referenceCandidate = referenceFieldMap.get(targetField);
      const referenceValueLookup = referenceCandidate
        ? this.buildReferenceValueLookup(referenceCandidate)
        : null;
      const normalizedValues = Object.fromEntries(
        Object.entries(rawValues)
          .map(([sourceValue, targetValue]) => {
            const sourceKey = this.normalizeValueMappingKey(sourceValue);
            const normalizedTarget = this.normalizeSuggestedValueMappingTarget(
              targetValue,
              referenceValueLookup,
            );

            return [sourceKey, normalizedTarget] as const;
          })
          .filter(
            (entry): entry is readonly [string, string | number | boolean] =>
              entry[0].length > 0 && typeof entry[1] !== 'undefined',
          ),
      );

      if (Object.keys(normalizedValues).length === 0) {
        continue;
      }

      valueMappings.push({
        targetField,
        values: normalizedValues,
        fallback: this.normalizeValueMappingFallback(
          entry.fallback as ImportValueMappingFallback,
        ),
        confidence: this.normalizeConfidence(entry.confidence),
        reason: this.normalizeOptionalString(entry.reason),
      });
    }

    return valueMappings;
  }

  private normalizeSuggestedValueMappingTarget(
    value: unknown,
    referenceValueLookup: Map<string, string | number> | null,
  ): string | number | boolean | undefined {
    if (value == null || typeof value === 'undefined') {
      return undefined;
    }

    if (referenceValueLookup) {
      const normalized = this.normalizeScalarString(value);
      if (!normalized) {
        return undefined;
      }

      return referenceValueLookup.get(normalized);
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    return undefined;
  }

  private buildReferenceValueLookup(
    candidate: ImportReferenceCandidate,
  ): Map<string, string | number> {
    const lookup = new Map<string, string | number>();
    const duplicateLabels = new Set<string>();

    for (const value of candidate.values) {
      lookup.set(String(value.handle), value.handle);

      const label = value.label.trim();
      if (!label) {
        continue;
      }

      if (lookup.has(label)) {
        duplicateLabels.add(label);
        continue;
      }

      lookup.set(label, value.handle);
    }

    for (const label of duplicateLabels) {
      lookup.delete(label);
    }

    return lookup;
  }

  private async buildImportReferenceCandidates(
    fields: EntityTemplateDto[],
  ): Promise<ImportReferenceCandidate[]> {
    const candidates: ImportReferenceCandidate[] = [];

    for (const field of fields) {
      if (!field.isReference || !field.referenceName || field.kind !== 'm:1') {
        continue;
      }

      const referenceTemplate = this.templateService.getEntityTemplate(
        field.referenceName,
      );
      const valueField =
        referenceTemplate.find((entry) => entry.options?.includes('isValue')) ??
        referenceTemplate.find((entry) => entry.name === 'handle');
      const entityClass = this.genericQueryService.getEntityClass(
        field.referenceName,
      );
      const records = await this.em.find(
        entityClass,
        {},
        {
          orderBy: { handle: 'ASC' } as never,
          limit: AI_REFERENCE_CANDIDATE_LIMIT,
        },
      );

      candidates.push({
        targetField: field.name,
        referenceName: field.referenceName,
        values: records
          .map((record) => this.toPlainRecord(record))
          .map((record) => ({
            handle: record.handle,
            label: String(
              record[valueField?.name ?? 'handle'] ?? record.handle,
            ),
          }))
          .filter(
            (record): record is { handle: string | number; label: string } =>
              typeof record.handle === 'string' ||
              typeof record.handle === 'number',
          ),
      });
    }

    return candidates;
  }

  private getImportableFields(
    template: EntityTemplateDto[],
  ): EntityTemplateDto[] {
    return template.filter((field) => {
      if (!field.name) {
        return false;
      }

      if (field.name === 'handle') {
        return true;
      }

      if (
        field.isPersistent === false ||
        field.options?.includes('isReadOnly') ||
        field.options?.includes('isSecurity')
      ) {
        return false;
      }

      return !['1:m', 'm:n', 'n:m', '1:1'].includes(field.kind ?? '');
    });
  }

  private limitAiSampleRows(
    rows: Record<string, unknown>[],
    maxSampleRows?: number | null,
  ): Record<string, unknown>[] {
    const limit =
      Number.isFinite(maxSampleRows) && (maxSampleRows ?? 0) > 0
        ? Math.min(8, Math.trunc(maxSampleRows ?? SAMPLE_ROW_LIMIT))
        : SAMPLE_ROW_LIMIT;

    return rows.slice(0, limit).map((row) => ({ ...row }));
  }

  private parseJsonObject(rawText: string): Record<string, unknown> {
    const text = rawText
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new BadRequestException('import.aiInvalidJsonResponse');
    }

    try {
      const parsed: unknown = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected JSON object');
      }

      return parsed as Record<string, unknown>;
    } catch {
      throw new BadRequestException('import.aiInvalidJsonResponse');
    }
  }

  private normalizeConfidence(value: unknown): number {
    const confidence = Number(value);
    if (!Number.isFinite(confidence)) {
      return 0.5;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private toRecordArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
      ? value.filter(
          (entry): entry is Record<string, unknown> =>
            !!entry && typeof entry === 'object' && !Array.isArray(entry),
        )
      : [];
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean)
      : [];
  }

  private normalizeRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private toPlainRecord(value: object): Record<string, unknown> {
    try {
      return wrap(value).toObject() as Record<string, unknown>;
    } catch {
      return { ...(value as Record<string, unknown>) };
    }
  }

  private async findBatch(handle: number): Promise<ImportBatchItem> {
    const batch = await this.tryFindBatch(handle);

    if (!batch) {
      throw new NotFoundException('import.batchNotFound');
    }

    return batch;
  }

  private async tryFindBatch(handle: number): Promise<ImportBatchItem | null> {
    return this.em.findOne(
      ImportBatchItem,
      { handle },
      { populate: ['source', 'targetEntity', 'importTemplate', 'createdBy'] },
    );
  }

  private async enqueueImportJob(
    jobName: (typeof IMPORT_JOB_NAMES)[keyof typeof IMPORT_JOB_NAMES],
    batchHandle: number,
    userHandle: number,
  ): Promise<void> {
    const batch = await this.findBatch(batchHandle);

    if (REDIS_ENABLED) {
      const job = await this.importQueue.add(jobName, {
        batchHandle,
        userHandle,
      });
      batch.jobId = job?.id == null ? null : String(job.id);
      await this.em.flush();
      return;
    }

    batch.jobId = `local-${jobName}-${Date.now()}`;
    await this.em.flush();

    setTimeout(() => {
      const promise =
        jobName === IMPORT_JOB_NAMES.validate
          ? this.processQueuedValidation(batchHandle, userHandle)
          : this.processQueuedExecution(batchHandle, userHandle);

      void promise.catch((error) => {
        global.log?.error?.(
          `Import background job failed: ${getImportErrorMessage(error)}`,
        );
      });
    }, 0);
  }

  private async runInImportContext<T>(callback: () => Promise<T>): Promise<T> {
    return RequestContext.create(this.em.fork(), callback);
  }

  private async findImportUser(userHandle: number): Promise<PersonItem> {
    const currentUser = await this.em.findOne(
      PersonItem,
      {
        handle: userHandle,
      },
      {
        populate: [
          'company',
          'roles',
          'roles.stage',
          'roles.permissions',
          'roles.permissions.entity',
        ],
      },
    );

    if (!currentUser) {
      throw new BadRequestException('global.currentUserRequired');
    }

    return currentUser;
  }

  private async markBatchJobFailed(
    handle: number,
    status: 'validationFailed' | 'executionFailed',
    operation: 'validation' | 'execution',
    error: unknown,
  ): Promise<void> {
    const batch = await this.tryFindBatch(handle);
    if (!batch) {
      return;
    }

    batch.status = status;
    batch.currentOperation = operation;
    batch.failedAt = new Date();
    batch.completedAt = null;
    batch.lastError = getImportErrorMessage(error);
    await this.em.flush();
  }

  private isImportBatchBusy(status: string): boolean {
    return [
      'validationQueued',
      'validating',
      'executionQueued',
      'executing',
    ].includes(status);
  }

  private createConfigureDtoFromBatch(
    batch: ImportBatchItem,
  ): ConfigureImportBatchDto {
    const mapping = this.normalizeRecord(batch.mapping) ?? {};

    return {
      entityHandle: this.normalizeRequiredString(
        this.extractHandle(batch.targetEntity),
      ),
      sourceHandle: this.extractHandle(batch.source),
      templateHandle: this.extractNumericHandle(batch.importTemplate),
      keyColumns: this.normalizeColumns(batch.externalKeyColumns ?? []),
      mappings: this.asImportRecordArray<ImportFieldMappingDto>(
        mapping.mappings,
      ),
      fieldDefaults: this.asImportRecordArray<ImportFieldDefaultDto>(
        mapping.fieldDefaults,
      ),
      relationMappings: this.asImportRecordArray<ImportRelationMappingDto>(
        mapping.relationMappings,
      ),
      valueMappings: this.asImportRecordArray<ImportValueMappingDto>(
        mapping.valueMappings,
      ),
      uniqueConflictStrategies:
        this.asImportRecordArray<ImportUniqueConflictStrategyDto>(
          mapping.uniqueConflictStrategies,
        ),
      genericReferenceMapping:
        this.normalizeGenericReferenceMapping(batch.genericReferenceMapping) ??
        null,
    };
  }

  private asImportRecordArray<T>(value: unknown): T[] {
    return Array.isArray(value)
      ? (value.filter((entry) => entry && typeof entry === 'object') as T[])
      : [];
  }

  private normalizeGenericReferenceMapping(
    value: unknown,
  ): ImportGenericReferenceMappingDto | null {
    const record = this.normalizeRecord(value);
    if (!record) {
      return null;
    }

    const entityHandle = this.normalizeOptionalString(record.entityHandle);
    if (!entityHandle) {
      return null;
    }

    return {
      entityHandle,
      sourceHandle: this.normalizeOptionalString(record.sourceHandle),
      keyColumns: this.normalizeColumns(
        Array.isArray(record.keyColumns)
          ? record.keyColumns.filter(
              (column): column is string => typeof column === 'string',
            )
          : [],
      ),
    };
  }

  private resolveMatchSourceColumns(
    batch: ImportBatchItem,
    requestedColumns: string[] | undefined,
  ): string[] {
    const headers = this.normalizeColumns(batch.headers ?? []);
    const requested = this.normalizeColumns(requestedColumns ?? []);

    if (requested.length > 0) {
      return requested.filter((column) => headers.includes(column));
    }

    const mapping = this.normalizeRecord(batch.mapping);
    const mappedColumns = this.asImportRecordArray<ImportFieldMappingDto>(
      mapping?.mappings,
    )
      .map((entry) => this.normalizeOptionalString(entry.sourceColumn))
      .filter((entry): entry is string => Boolean(entry));

    return mappedColumns.length > 0
      ? Array.from(new Set(mappedColumns))
      : headers;
  }

  private resolveMatchTargetFields(
    entityHandle: string,
    requestedFields: string[] | undefined,
  ): string[] {
    const template = this.templateService.getEntityTemplate(entityHandle);
    const persistentScalarFields = template
      .filter((field) => {
        if (!field.name || field.isPersistent === false) {
          return false;
        }

        if (['1:m', 'm:n', 'n:m', '1:1'].includes(field.kind ?? '')) {
          return false;
        }

        return true;
      })
      .map((field) => field.name);
    const requested = this.normalizeColumns(requestedFields ?? []);

    if (requested.length > 0) {
      return requested.filter((field) =>
        persistentScalarFields.includes(field),
      );
    }

    const preferredNames = new Set([
      'handle',
      'number',
      'externalNumber',
      'title',
      'name',
      'description',
      'email',
      'firstName',
      'lastName',
    ]);

    return template
      .filter(
        (field) =>
          field.name &&
          persistentScalarFields.includes(field.name) &&
          (field.options?.includes('isValue') ||
            preferredNames.has(field.name)),
      )
      .map((field) => field.name);
  }

  private async resolveRowExternalLinkReference(
    batch: ImportBatchItem,
    row: ImportBatchRowItem,
  ): Promise<string | null> {
    if (!row.externalKeyHash) {
      return null;
    }

    const link = await this.findRowExternalLink(batch, row);
    return link?.reference ?? null;
  }

  private async findMatchCandidatesForRow(
    entityHandle: string,
    row: ImportBatchRowItem,
    sourceColumns: string[],
    targetFields: string[],
    limitPerValue: number,
    currentUser: PersonItem,
  ): Promise<ImportMatchCandidateDto[]> {
    const candidates = new Map<string, ImportMatchCandidateDto>();

    for (const sourceColumn of sourceColumns) {
      const value = this.normalizeScalarString(row.rawData[sourceColumn]);
      if (value.length < 2) {
        continue;
      }

      const filter = {
        $or: targetFields.map((targetField) => ({
          [targetField]: { $ilike: `%${value}%` },
        })),
      };
      const result = await this.genericService.findAndCount(
        entityHandle,
        filter,
        1,
        limitPerValue,
        {},
        currentUser,
        [],
      );

      for (const record of result.data) {
        const reference = this.extractResultHandle(record);
        if (reference == null) {
          continue;
        }

        const key = String(reference);
        const existing = candidates.get(key);
        const confidence = this.calculateMatchConfidence(
          record,
          targetFields,
          value,
          result.meta.total,
        );

        if (!existing || confidence > existing.confidence) {
          candidates.set(key, {
            reference: key,
            displayValue: this.buildMatchDisplayValue(entityHandle, record),
            confidence,
            reason:
              result.meta.total === 1
                ? 'import.matchSingleValue'
                : 'import.matchCandidate',
          });
        }
      }
    }

    return [...candidates.values()]
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, limitPerValue);
  }

  private calculateMatchConfidence(
    record: object,
    targetFields: string[],
    value: string,
    totalMatches: number,
  ): number {
    const normalizedValue = value.toLocaleLowerCase();
    const plainRecord = this.toPlainRecord(record);
    const hasExactValue = targetFields.some((field) => {
      const fieldValue = this.normalizeScalarString(plainRecord[field]);
      return fieldValue.toLocaleLowerCase() === normalizedValue;
    });

    if (hasExactValue && totalMatches === 1) {
      return 0.95;
    }

    if (hasExactValue) {
      return 0.8;
    }

    return totalMatches === 1 ? 0.75 : 0.45;
  }

  private buildMatchDisplayValue(entityHandle: string, record: object): string {
    const template = this.templateService.getEntityTemplate(entityHandle);
    const plainRecord = this.toPlainRecord(record);
    const valueField =
      template.find((field) => field.options?.includes('isValue')) ??
      template.find((field) => field.name === 'title') ??
      template.find((field) => field.name === 'name') ??
      template.find((field) => field.name === 'handle');
    const value = valueField?.name
      ? this.normalizeScalarString(plainRecord[valueField.name])
      : '';
    const handle = this.extractResultHandle(record);

    return value || (handle == null ? '' : String(handle));
  }

  private async buildPayload(
    template: EntityTemplateDto[],
    rawData: Record<string, unknown>,
    dto: ConfigureImportBatchDto,
    entityHandle: string,
    currentUser: PersonItem,
  ): Promise<Record<string, unknown>> {
    const mapped: Record<string, unknown> = {};

    for (const mapping of dto.mappings ?? []) {
      const sourceColumn = this.normalizeOptionalString(mapping.sourceColumn);
      const targetField = this.normalizeOptionalString(mapping.targetField);
      if (!sourceColumn || !targetField) {
        continue;
      }
      mapped[targetField] = await this.applyValueMapping(
        template,
        targetField,
        rawData[sourceColumn] ?? '',
        dto.valueMappings ?? [],
      );
    }

    const payload = normalizeImportRow(template, mapped);
    await this.applyRelationMappings(
      template,
      payload,
      rawData,
      dto.relationMappings ?? [],
    );
    this.applyFieldDefaults(template, payload, dto.fieldDefaults ?? []);
    await this.applyGenericReferenceMapping(
      template,
      payload,
      rawData,
      entityHandle,
      dto.genericReferenceMapping ?? null,
    );
    this.applyCurrentPersonDefaults(template, payload, currentUser);
    this.genericCustomFieldService.collectCustomFieldsFromFlatPayload(payload);

    return payload;
  }

  private applyFieldDefaults(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    defaults: ImportFieldDefaultDto[],
  ): void {
    for (const fieldDefault of defaults) {
      const targetField = this.normalizeOptionalString(
        fieldDefault.targetField,
      );
      const field = template.find((field) => field.name === targetField);
      if (!targetField || !field) {
        continue;
      }

      const currentValue = payload[targetField];
      if (currentValue != null && this.normalizeScalarString(currentValue)) {
        continue;
      }

      payload[targetField] = this.normalizeFieldDefaultValue(
        field,
        fieldDefault.value,
      );
    }
  }

  private normalizeFieldDefaultValue(
    field: EntityTemplateDto,
    value: unknown,
  ): unknown {
    const normalizedValue =
      field.isReference && value && typeof value === 'object'
        ? ((value as Record<string, unknown>).handle ?? value)
        : value;

    return normalizeImportRow([field], {
      [field.name]: normalizedValue,
    })[field.name];
  }

  private applyCurrentPersonDefaults(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    currentUser: PersonItem,
  ): void {
    if (currentUser.handle == null) {
      return;
    }

    template
      .filter(
        (field) =>
          field.options?.includes('isCurrentPerson') &&
          field.referenceName === 'person',
      )
      .forEach((field) => {
        if (
          payload[field.name] == null ||
          String(payload[field.name]).trim() === ''
        ) {
          payload[field.name] = currentUser.handle;
        }
      });
  }

  private validateImportDateValues(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
  ): void {
    const invalidDateFields = template
      .filter((field) => this.isDateField(field))
      .filter((field) => this.isInvalidImportDateValue(payload[field.name]))
      .map((field) => field.name);

    if (invalidDateFields.length === 0) {
      return;
    }

    throw new Error(
      `import.invalidDateValues:${Array.from(new Set(invalidDateFields)).join(',')}`,
    );
  }

  private isDateField(field: EntityTemplateDto): boolean {
    return ['date', 'datetime', 'DateType'].includes(field.type);
  }

  private isInvalidImportDateValue(value: unknown): boolean {
    if (value == null || value instanceof Date) {
      return false;
    }

    if (typeof value !== 'string') {
      return false;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return false;
    }

    if (normalizedValue.toLowerCase() === 'null') {
      return true;
    }

    return Number.isNaN(Date.parse(normalizedValue));
  }

  private validateImportBooleanValues(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
  ): void {
    const invalidBooleanFields = template
      .filter((field) => this.isBooleanField(field))
      .filter((field) => this.isInvalidImportBooleanValue(payload[field.name]))
      .map((field) => field.name);

    if (invalidBooleanFields.length === 0) {
      return;
    }

    throw new Error(
      `${INVALID_BOOLEAN_VALUES_MESSAGE_PREFIX}:${Array.from(new Set(invalidBooleanFields)).join(',')}`,
    );
  }

  private isBooleanField(field: EntityTemplateDto): boolean {
    return field.type === 'boolean';
  }

  private isInvalidImportBooleanValue(value: unknown): boolean {
    return value != null && typeof value !== 'boolean';
  }

  private async applyRelationMappings(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    rawData: Record<string, unknown>,
    mappings: ImportRelationMappingDto[],
  ): Promise<void> {
    for (const mapping of mappings) {
      const field = template.find(
        (entry) => entry.name === mapping.targetField,
      );
      if (!field?.isReference || !field.referenceName || field.kind !== 'm:1') {
        continue;
      }

      const sourceColumns = this.getMappingColumns(mapping);
      if (sourceColumns.length === 0) {
        continue;
      }

      switch (mapping.mode) {
        case 'externalKey':
          payload[field.name] = await this.resolveExternalReference(
            mapping.sourceHandle,
            field.referenceName,
            sourceColumns,
            rawData,
          );
          break;
        case 'value':
          payload[field.name] = await this.resolveValueReference(
            field.referenceName,
            rawData[sourceColumns[0]],
          );
          break;
        case 'handle':
        default:
          payload[field.name] = rawData[sourceColumns[0]];
          break;
      }
    }
  }

  private async applyGenericReferenceMapping(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    rawData: Record<string, unknown>,
    entityHandle: string,
    mapping: ImportGenericReferenceMappingDto | null,
  ): Promise<void> {
    if (!mapping) {
      return;
    }

    const genericReferenceField = template.find(
      (field) =>
        field.genericReference?.entityField &&
        field.genericReference?.handleField,
    );

    if (!genericReferenceField?.genericReference) {
      return;
    }

    const reference = await this.resolveExternalReference(
      mapping.sourceHandle,
      mapping.entityHandle,
      mapping.keyColumns,
      rawData,
    );

    payload[genericReferenceField.genericReference.entityField] =
      mapping.entityHandle;
    payload[genericReferenceField.genericReference.handleField] = reference;
  }

  private async resolveExternalReference(
    sourceHandle: string | null | undefined,
    entityHandle: string,
    keyColumns: string[],
    rawData: Record<string, unknown>,
  ): Promise<string> {
    const normalizedSourceHandle = this.normalizeRequiredString(sourceHandle);
    const externalKey = this.buildExternalKey(
      normalizedSourceHandle,
      entityHandle,
      keyColumns,
      rawData,
    );
    const link = await this.em.findOne(ExternalRecordLinkItem, {
      source: { handle: normalizedSourceHandle },
      entity: { handle: entityHandle },
      externalKeyHash: externalKey.hash,
    });

    const resolvedLink =
      link ??
      (await this.findExternalReferenceBySingleKeyValue(
        normalizedSourceHandle,
        entityHandle,
        externalKey,
      ));

    if (!resolvedLink) {
      throw new NotFoundException('import.externalReferenceNotFound');
    }

    return resolvedLink.reference;
  }

  private async findExternalReferenceBySingleKeyValue(
    sourceHandle: string,
    entityHandle: string,
    externalKey: ExternalKey,
  ): Promise<ExternalRecordLinkItem | null> {
    const keyValues = Object.values(externalKey.parts)
      .map((value) => this.normalizeScalarString(value))
      .filter((value) => value.length > 0);

    if (keyValues.length !== 1 || Object.keys(externalKey.parts).length !== 1) {
      return null;
    }

    const rows = (await this.em.getConnection().execute(
      `
        select handle
        from external_record_link_item
        where source_handle = ?
          and entity_handle = ?
          and (
            select count(*)
            from jsonb_object_keys(external_key_parts)
          ) = 1
          and exists (
            select 1
            from jsonb_each_text(external_key_parts) as key_part(key, value)
            where key_part.value = ?
          )
        limit 2
      `,
      [sourceHandle, entityHandle, keyValues[0]],
    )) as Array<{ handle: number }>;

    if (rows.length > 1) {
      throw new ConflictException('import.externalReferenceNotUnique');
    }

    if (rows.length === 0) {
      return null;
    }

    return this.em.findOne(ExternalRecordLinkItem, { handle: rows[0].handle });
  }

  private async resolveValueReference(
    entityHandle: string,
    value: unknown,
  ): Promise<string | number | null> {
    const normalizedValue = this.normalizeScalarString(value);
    if (!normalizedValue) {
      return null;
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
    const valueField =
      template.find((field) => field.options?.includes('isValue')) ??
      template.find((field) => field.name === 'handle');

    if (!valueField?.name) {
      throw new BadRequestException('import.referenceValueFieldNotFound');
    }

    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const matches = await this.em.find(
      entityClass,
      { [valueField.name]: normalizedValue },
      { limit: 2 },
    );

    if (matches.length !== 1) {
      throw new NotFoundException('import.referenceValueNotUnique');
    }

    return this.extractResultHandle(matches[0]);
  }

  private async applyValueMapping(
    template: EntityTemplateDto[],
    targetField: string,
    value: unknown,
    mappings: ImportValueMappingDto[],
  ): Promise<unknown> {
    const mapping = mappings.find((entry) => entry.targetField === targetField);

    if (!mapping) {
      return value;
    }

    const sourceKey = this.normalizeValueMappingKey(value);
    if (!sourceKey) {
      return value;
    }

    if (Object.prototype.hasOwnProperty.call(mapping.values, sourceKey)) {
      return mapping.values[sourceKey];
    }

    switch (this.normalizeValueMappingFallback(mapping.fallback)) {
      case 'empty':
        return '';
      case 'error':
        throw new BadRequestException(
          this.createValueMappingMissingMessage(targetField, sourceKey),
        );
      case 'keep':
      default:
        return this.resolveKeptOriginalValue(template, targetField, value);
    }
  }

  private async resolveKeptOriginalValue(
    template: EntityTemplateDto[],
    targetField: string,
    value: unknown,
  ): Promise<unknown> {
    const field = template.find((entry) => entry.name === targetField);
    if (!field?.isReference || !field.referenceName || field.kind !== 'm:1') {
      return value;
    }

    try {
      return await this.resolveValueReference(field.referenceName, value);
    } catch {
      throw new BadRequestException(
        this.createValueMappingMissingMessage(
          targetField,
          this.normalizeValueMappingKey(value),
        ),
      );
    }
  }

  private createValueMappingMissingMessage(
    targetField: string,
    sourceValue: string,
  ): string {
    const encodedTargetField = encodeURIComponent(targetField.trim());
    const encodedSourceValue = encodeURIComponent(sourceValue.trim());
    return `import.valueMappingMissing:${encodedTargetField}:${encodedSourceValue}`;
  }

  private normalizeValueMappingKey(value: unknown): string {
    return this.normalizeScalarString(value);
  }

  private normalizeValueMappingFallback(
    fallback: ImportValueMappingFallback | undefined,
  ): ImportValueMappingFallback {
    return fallback === 'empty' || fallback === 'error' ? fallback : 'keep';
  }

  private async syncTemplateValueMappings(
    template: ImportTemplateItem,
    mappings: ImportValueMappingDto[],
  ): Promise<void> {
    if (template.handle) {
      await this.em.nativeDelete(ImportTemplateValueMappingItem, {
        importTemplate: { handle: template.handle },
      });
    }

    await this.resetSerialSequence(
      'import_template_value_mapping_item',
      'handle',
    );

    for (const mapping of this.normalizeValueMappings(mappings)) {
      for (const [sourceValue, targetValue] of Object.entries(mapping.values)) {
        const valueMapping = new ImportTemplateValueMappingItem();
        valueMapping.importTemplate = template;
        valueMapping.targetField = mapping.targetField;
        valueMapping.sourceValue = sourceValue;
        valueMapping.targetValue = this.normalizeScalarString(targetValue);
        valueMapping.fallback = this.normalizeValueMappingFallback(
          mapping.fallback,
        );
        this.em.persist(valueMapping);
      }
    }
  }

  private async resetSerialSequence(
    tableName: 'import_template_item' | 'import_template_value_mapping_item',
    columnName: 'handle',
  ): Promise<void> {
    await this.em.getConnection().execute(`
      select setval(
        pg_get_serial_sequence('${tableName}', '${columnName}'),
        coalesce((select max(${columnName}) from ${tableName}), 1),
        (select max(${columnName}) from ${tableName}) is not null
      )
    `);
  }

  private normalizeValueMappings(
    mappings: ImportValueMappingDto[],
  ): ImportValueMappingDto[] {
    const normalized: ImportValueMappingDto[] = [];

    for (const mapping of mappings) {
      const targetField = this.normalizeOptionalString(mapping.targetField);
      if (
        !targetField ||
        !mapping.values ||
        typeof mapping.values !== 'object'
      ) {
        continue;
      }

      const values: Record<string, unknown> = {};

      for (const [sourceValue, targetValue] of Object.entries(mapping.values)) {
        const sourceKey = this.normalizeValueMappingKey(sourceValue);
        const normalizedTargetValue = this.normalizeScalarString(targetValue);

        if (!sourceKey || !normalizedTargetValue) {
          continue;
        }

        values[sourceKey] = targetValue;
      }

      if (Object.keys(values).length === 0) {
        continue;
      }

      normalized.push({
        targetField,
        values,
        fallback: this.normalizeValueMappingFallback(mapping.fallback),
      });
    }

    return normalized;
  }

  private mergeValueMappings(
    baseMappings: ImportValueMappingDto[],
    overrideMappings: ImportValueMappingDto[],
  ): ImportValueMappingDto[] {
    const merged = new Map<string, ImportValueMappingDto>();

    for (const mapping of this.normalizeValueMappings(baseMappings)) {
      merged.set(mapping.targetField, {
        targetField: mapping.targetField,
        values: { ...mapping.values },
        fallback: mapping.fallback,
      });
    }

    for (const mapping of this.normalizeValueMappings(overrideMappings)) {
      const existing = merged.get(mapping.targetField);
      merged.set(mapping.targetField, {
        targetField: mapping.targetField,
        values: {
          ...(existing?.values ?? {}),
          ...mapping.values,
        },
        fallback: mapping.fallback ?? existing?.fallback,
      });
    }

    return [...merged.values()];
  }

  private getTemplateConfiguredValueMappings(
    template: ImportTemplateItem,
  ): ImportValueMappingDto[] {
    const entityMappings = this.getTemplateEntityValueMappings(template);
    if (entityMappings.length > 0) {
      return entityMappings;
    }

    const mapping = template.mapping as { valueMappings?: unknown };
    return Array.isArray(mapping?.valueMappings)
      ? this.normalizeValueMappings(
          mapping.valueMappings as ImportValueMappingDto[],
        )
      : [];
  }

  private getTemplateEntityValueMappings(
    template: ImportTemplateItem,
  ): ImportValueMappingDto[] {
    const groupedMappings = new Map<string, ImportValueMappingDto>();
    const valueMappings = this.getInitializedTemplateValueMappings(template);

    for (const valueMapping of valueMappings) {
      if (!valueMapping.targetField || !valueMapping.sourceValue) {
        continue;
      }

      const fallback = this.normalizeValueMappingFallback(
        valueMapping.fallback as ImportValueMappingFallback,
      );
      const key = `${valueMapping.targetField}|${fallback}`;
      const existing = groupedMappings.get(key) ?? {
        targetField: valueMapping.targetField,
        values: {},
        fallback,
      };

      existing.values[valueMapping.sourceValue] = valueMapping.targetValue;
      groupedMappings.set(key, existing);
    }

    return [...groupedMappings.values()];
  }

  private getInitializedTemplateValueMappings(
    template: ImportTemplateItem,
  ): ImportTemplateValueMappingItem[] {
    const valueMappings = template.valueMappings as unknown;

    if (!this.isImportTemplateValueMappingCollection(valueMappings)) {
      return [];
    }

    return valueMappings.isInitialized() ? valueMappings.getItems() : [];
  }

  private isImportTemplateValueMappingCollection(value: unknown): value is {
    isInitialized: () => boolean;
    getItems: () => ImportTemplateValueMappingItem[];
  } {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.isInitialized === 'function' &&
      typeof candidate.getItems === 'function'
    );
  }

  private getMissingRequiredFieldNames(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    action: string | null,
  ): string[] {
    if (action === 'updated') {
      return [];
    }

    return template
      .filter((field) => {
        if (!field.isRequired || field.name === 'handle') {
          return false;
        }
        if (field.name.startsWith('customFields.') || field.customField) {
          return false;
        }

        const value = payload[field.name];
        return value == null || this.normalizeScalarString(value).length === 0;
      })
      .map((field) => field.name);
  }

  private async applyUniqueConflictStrategies(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    dto: ConfigureImportBatchDto,
    entityHandle: string,
    row: ImportBatchRowItem,
    targetReference: string | number | null,
    externalKey: ExternalKey | null,
    uniqueValueClaims: Map<string, number>,
  ): Promise<void> {
    for (const field of template) {
      if (!this.isImportUniqueConflictField(field)) {
        continue;
      }

      const originalValue = this.normalizeScalarString(payload[field.name]);
      if (!originalValue) {
        continue;
      }

      const strategy = this.getUniqueConflictStrategy(dto, field.name);
      const originalClaimKey = this.createUniqueValueClaimKey(
        field.name,
        originalValue,
      );
      const originalBatchConflictRow = uniqueValueClaims.get(originalClaimKey);
      const originalDatabaseConflict = await this.hasUniqueValueConflict(
        entityHandle,
        field.name,
        originalValue,
        targetReference,
      );

      if (!originalBatchConflictRow && !originalDatabaseConflict) {
        uniqueValueClaims.set(originalClaimKey, row.rowNumber);
        continue;
      }

      if (strategy !== 'appendExternalKey') {
        throw new BadRequestException(
          originalBatchConflictRow
            ? this.createUniqueFieldDuplicateInBatchMessage(
                field.name,
                originalValue,
              )
            : this.createUniqueFieldConflictMessage(field.name, originalValue),
        );
      }

      const suffixedValue = this.appendUniqueConflictSuffix(
        field,
        originalValue,
        this.createUniqueConflictSuffix(row, externalKey),
      );
      const suffixedClaimKey = this.createUniqueValueClaimKey(
        field.name,
        suffixedValue,
      );
      const suffixedBatchConflictRow = uniqueValueClaims.get(suffixedClaimKey);
      const suffixedDatabaseConflict = await this.hasUniqueValueConflict(
        entityHandle,
        field.name,
        suffixedValue,
        targetReference,
      );

      if (suffixedBatchConflictRow || suffixedDatabaseConflict) {
        throw new BadRequestException(
          suffixedBatchConflictRow
            ? this.createUniqueFieldDuplicateInBatchMessage(
                field.name,
                suffixedValue,
              )
            : this.createUniqueFieldConflictMessage(field.name, suffixedValue),
        );
      }

      payload[field.name] = suffixedValue;
      uniqueValueClaims.set(suffixedClaimKey, row.rowNumber);
    }
  }

  private isImportUniqueConflictField(field: EntityTemplateDto): boolean {
    return Boolean(
      field.name &&
      field.isUnique &&
      !field.isPrimaryKey &&
      !field.isReference &&
      !field.customField &&
      !field.name.startsWith('customFields.') &&
      field.isPersistent !== false &&
      this.isImportTextField(field),
    );
  }

  private isImportTextField(field: EntityTemplateDto): boolean {
    return ['string', 'text', 'varchar'].includes(field.type);
  }

  private getUniqueConflictStrategy(
    dto: ConfigureImportBatchDto,
    targetField: string,
  ): ImportUniqueConflictStrategyMode {
    const strategy = dto.uniqueConflictStrategies?.find(
      (entry) => entry.targetField === targetField,
    )?.strategy;

    return strategy === 'appendExternalKey' ? 'appendExternalKey' : 'error';
  }

  private async hasUniqueValueConflict(
    entityHandle: string,
    targetField: string,
    value: string,
    currentReference: string | number | null,
  ): Promise<boolean> {
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const matches = await this.em.find(
      entityClass,
      { [targetField]: value },
      { limit: 2 },
    );
    const currentReferenceText =
      currentReference == null ? null : String(currentReference);

    return matches.some((match) => {
      const handle = this.extractResultHandle(match);
      return handle == null || String(handle) !== currentReferenceText;
    });
  }

  private createUniqueConflictSuffix(
    row: ImportBatchRowItem,
    externalKey: ExternalKey | null,
  ): string {
    const externalKeySuffix = Object.values(externalKey?.parts ?? {})
      .map((value) => this.normalizeScalarString(value))
      .filter(Boolean)
      .join('-');

    return externalKeySuffix || `row-${row.rowNumber}`;
  }

  private appendUniqueConflictSuffix(
    field: EntityTemplateDto,
    value: string,
    suffix: string,
  ): string {
    const suffixText = ` (${suffix})`;
    const maxLength =
      typeof field.length === 'number' && Number.isFinite(field.length)
        ? Math.trunc(field.length)
        : null;

    if (!maxLength || value.length + suffixText.length <= maxLength) {
      return `${value}${suffixText}`;
    }

    const prefixLength = maxLength - suffixText.length;
    if (prefixLength > 0) {
      return `${value.slice(0, prefixLength).trimEnd()}${suffixText}`;
    }

    return `${value}${suffixText}`.slice(0, maxLength);
  }

  private createUniqueValueClaimKey(fieldName: string, value: string): string {
    return `${fieldName}:${value.trim().toLocaleLowerCase()}`;
  }

  private createUniqueFieldConflictMessage(
    fieldName: string,
    value: string,
  ): string {
    return [
      'import.uniqueFieldConflict',
      encodeURIComponent(fieldName),
      encodeURIComponent(value),
    ].join(':');
  }

  private createUniqueFieldDuplicateInBatchMessage(
    fieldName: string,
    value: string,
  ): string {
    return [
      'import.uniqueFieldDuplicateInBatch',
      encodeURIComponent(fieldName),
      encodeURIComponent(value),
    ].join(':');
  }

  private createRequiredFieldsMissingMessage(fieldNames: string[]): string {
    const normalizedFieldNames = Array.from(
      new Set(fieldNames.map((fieldName) => fieldName.trim()).filter(Boolean)),
    );

    return `${REQUIRED_FIELDS_MISSING_MESSAGE_PREFIX}:${normalizedFieldNames.join(',')}`;
  }

  private async resolvePlannedAction(
    entityHandle: string,
    payload: Record<string, unknown>,
    sourceHandle: string | null,
    externalKeyHash: string | null,
  ): Promise<ImportPlannedAction> {
    if (sourceHandle && externalKeyHash) {
      const link = await this.em.findOne(ExternalRecordLinkItem, {
        source: { handle: sourceHandle },
        entity: { handle: entityHandle },
        externalKeyHash,
      });

      return {
        action: link ? 'updated' : 'created',
        targetReference: link?.reference ?? null,
      };
    }

    const payloadHandle = extractImportHandle(payload);
    return {
      action: payloadHandle == null ? 'created' : 'updated',
      targetReference: payloadHandle,
    };
  }

  private async findRowExternalLink(
    batch: ImportBatchItem,
    row: ImportBatchRowItem,
  ): Promise<ExternalRecordLinkItem | null> {
    const sourceHandle = this.extractHandle(batch.source);
    const entityHandle = this.extractHandle(batch.targetEntity);

    if (!sourceHandle || !entityHandle || !row.externalKeyHash) {
      return null;
    }

    return this.em.findOne(ExternalRecordLinkItem, {
      source: { handle: sourceHandle },
      entity: { handle: entityHandle },
      externalKeyHash: row.externalKeyHash,
    });
  }

  private async upsertExternalLink(
    batch: ImportBatchItem,
    row: ImportBatchRowItem,
  ): Promise<void> {
    const sourceHandle = this.extractHandle(batch.source);
    const entityHandle = this.extractHandle(batch.targetEntity);

    if (
      !sourceHandle ||
      !entityHandle ||
      !row.externalKeyHash ||
      !row.externalKeyParts ||
      !row.targetReference
    ) {
      return;
    }

    let link = await this.em.findOne(ExternalRecordLinkItem, {
      source: { handle: sourceHandle },
      entity: { handle: entityHandle },
      externalKeyHash: row.externalKeyHash,
    });

    if (!link) {
      link = new ExternalRecordLinkItem();
      link.source = { handle: sourceHandle } as ImportSourceItem;
      link.entity = { handle: entityHandle } as EntityItem;
      link.externalKeyHash = row.externalKeyHash;
      link.externalKeyParts = row.externalKeyParts;
      link.firstImportBatch = { handle: batch.handle } as ImportBatchItem;
      this.em.persist(link);
    }

    link.reference = row.targetReference;
    link.externalKeyParts = row.externalKeyParts;
    link.lastImportBatch = { handle: batch.handle } as ImportBatchItem;
    link.lastSeenAt = new Date();
  }

  private buildExternalKey(
    sourceHandle: string,
    entityHandle: string,
    columns: string[],
    rawData: Record<string, unknown>,
  ): ExternalKey {
    const normalizedColumns = this.normalizeColumns(columns);
    if (normalizedColumns.length === 0) {
      throw new BadRequestException('import.externalKeyColumnsRequired');
    }

    const parts = Object.fromEntries(
      normalizedColumns.map((column) => [
        column,
        this.normalizeScalarString(rawData[column]),
      ]),
    );

    if (Object.values(parts).some((value) => String(value).length === 0)) {
      throw new BadRequestException('import.externalKeyValueMissing');
    }

    const hashInput = JSON.stringify({
      sourceHandle,
      entityHandle,
      parts,
    });

    return {
      parts,
      hash: createHash('sha256').update(hashInput).digest('hex'),
    };
  }

  private toBatchSummary(
    batch: ImportBatchItem,
    rows: ImportBatchRowItem[],
  ): ImportBatchSummaryDto {
    const resultSummary = this.toBatchResultSummary(batch);

    return {
      handle: batch.handle ?? null,
      status: batch.status,
      currentOperation: batch.currentOperation ?? null,
      filename: batch.filename,
      mimetype: batch.mimetype ?? null,
      fileSize: batch.fileSize ?? null,
      sourceHandle: this.extractHandle(batch.source),
      entityHandle: this.extractHandle(batch.targetEntity),
      templateHandle: this.extractNumericHandle(batch.importTemplate),
      rowCount: batch.rowCount ?? rows.length,
      processedCount: batch.processedCount,
      readyCount: batch.readyCount,
      errorCount: batch.errorCount,
      createdCount: batch.createdCount,
      updatedCount: batch.updatedCount,
      skippedCount: batch.skippedCount,
      failedCount: batch.failedCount,
      delimiter: batch.delimiter ?? null,
      headers: batch.headers ?? [],
      sampleRows: batch.sampleRows ?? [],
      mapping: batch.mapping ?? null,
      externalKeyColumns: batch.externalKeyColumns ?? null,
      genericReferenceMapping: batch.genericReferenceMapping ?? null,
      jobId: batch.jobId ?? null,
      startedAt: batch.startedAt ?? null,
      executedAt: batch.executedAt ?? null,
      completedAt: batch.completedAt ?? null,
      failedAt: batch.failedAt ?? null,
      lastError: batch.lastError ?? null,
      createdAt: batch.createdAt ?? null,
      updatedAt: batch.updatedAt ?? null,
      resultSummary,
      rows: rows.map((row) => this.toBatchRowSummary(row)),
    };
  }

  private toBatchResultSummary(
    batch: ImportBatchItem,
  ): ImportBatchResultSummaryDto {
    return {
      totalRows: batch.rowCount ?? 0,
      processedRows: batch.processedCount ?? 0,
      readyRows: batch.readyCount ?? 0,
      errorRows: batch.errorCount ?? 0,
      createdRows: batch.createdCount ?? 0,
      updatedRows: batch.updatedCount ?? 0,
      skippedRows: batch.skippedCount ?? 0,
      failedRows: batch.failedCount ?? 0,
    };
  }

  private toBatchRowSummary(row: ImportBatchRowItem): ImportBatchRowSummaryDto {
    return {
      handle: row.handle ?? null,
      rowNumber: row.rowNumber,
      status: row.status,
      action: row.action ?? null,
      targetReference: row.targetReference ?? null,
      externalKeyHash: row.externalKeyHash ?? null,
      externalKeyParts: row.externalKeyParts ?? null,
      rawData: row.rawData,
      payload: row.payload ?? null,
      message: row.message ?? null,
    };
  }

  private getMappingColumns(mapping: ImportRelationMappingDto): string[] {
    return this.normalizeColumns(
      mapping.sourceColumns?.length
        ? mapping.sourceColumns
        : mapping.sourceColumn
          ? [mapping.sourceColumn]
          : [],
    );
  }

  private normalizeColumns(columns: string[]): string[] {
    return Array.from(
      new Set(columns.map((column) => column.trim()).filter(Boolean)),
    );
  }

  private normalizeRequiredString(value: unknown): string {
    const normalized = this.normalizeOptionalString(value);
    if (!normalized) {
      throw new BadRequestException('exception.badRequest');
    }
    return normalized;
  }

  private normalizeOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private normalizeScalarString(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString().trim();
    }

    return '';
  }

  private extractHandle(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const handle = (value as { handle?: unknown }).handle;
    return typeof handle === 'string' ? handle : null;
  }

  private extractNumericHandle(value: unknown): number | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const handle = (value as { handle?: unknown }).handle;
    return typeof handle === 'number' ? handle : null;
  }

  private toTemplateSummary(
    template: ImportTemplateItem,
  ): ImportTemplateSummaryDto {
    return {
      handle: template.handle ?? null,
      title: template.title,
      description: template.description ?? null,
      sourceHandle: this.extractHandle(template.source) ?? '',
      entityHandle: this.extractHandle(template.targetEntity) ?? '',
      isActive: template.isActive,
      mapping: {
        ...(template.mapping ?? {}),
        valueMappings: this.getTemplateConfiguredValueMappings(template),
      },
      externalKeyColumns: template.externalKeyColumns ?? null,
      genericReferenceMapping: template.genericReferenceMapping ?? null,
    };
  }

  private extractResultHandle(value: unknown): string | number | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const handle = (value as { handle?: unknown }).handle;
    return typeof handle === 'string' || typeof handle === 'number'
      ? handle
      : null;
  }
}
