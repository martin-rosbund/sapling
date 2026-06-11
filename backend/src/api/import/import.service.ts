import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { createHash } from 'crypto';
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
  ImportBatchSummaryDto,
  ImportFieldDefaultDto,
  ImportGenericReferenceMappingDto,
  ImportTemplateSummaryDto,
  ImportRelationMappingDto,
  ImportValueMappingDto,
  ImportValueMappingFallback,
  SaveImportTemplateDto,
} from './import.types';

type ExternalKey = {
  hash: string;
  parts: Record<string, unknown>;
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
const OPEN_IMPORT_BATCH_STATUSES = [
  'analyzed',
  'validated',
  'validatedWithErrors',
] as const;

@Injectable()
export class ImportService {
  constructor(
    private readonly em: EntityManager,
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly genericService: GenericService,
    private readonly genericQueryService: GenericQueryService,
    private readonly templateService: TemplateService,
    private readonly genericCustomFieldService: GenericCustomFieldService,
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
    const entityHandle = this.normalizeRequiredString(dto.entityHandle);
    const batch = await this.findBatch(handle);
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

    const valueMappings =
      dto.valueMappings?.length || !importTemplate
        ? (dto.valueMappings ?? [])
        : this.getTemplateConfiguredValueMappings(importTemplate);
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
    };
    batch.externalKeyColumns = keyColumns;
    batch.genericReferenceMapping = dto.genericReferenceMapping ?? null;
    batch.status = 'validating';

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
    let readyCount = 0;
    let errorCount = 0;

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
            throw new BadRequestException('import.duplicateExternalKeyInBatch');
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
        const action = await this.resolvePlannedAction(
          entityHandle,
          payload,
          source?.handle ?? null,
          externalKey?.hash ?? null,
        );

        this.assertRequiredFields(template, payload, action);
        if (action !== 'updated') {
          await this.genericCustomFieldService.assertRequiredFields(
            entityHandle,
            this.normalizeRecord(payload.customFields) ?? {},
          );
        }

        row.payload = payload;
        row.externalKeyHash = externalKey?.hash ?? null;
        row.externalKeyParts = externalKey?.parts ?? null;
        row.action = action;
        row.status = 'ready';
        row.message = null;
        readyCount += 1;
      } catch (error) {
        row.payload = null;
        row.action = null;
        row.status = 'error';
        row.message = getImportErrorMessage(error);
        errorCount += 1;
      }
    }

    batch.readyCount = readyCount;
    batch.errorCount = errorCount;
    batch.status = errorCount > 0 ? 'validatedWithErrors' : 'validated';

    await this.em.flush();
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
    const batch = await this.findBatch(handle);
    const entityHandle = this.extractHandle(batch.targetEntity);

    if (!entityHandle) {
      throw new BadRequestException('import.targetEntityRequired');
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

    const rows = await this.em.find(
      ImportBatchRowItem,
      { batch: { handle: batch.handle } },
      { orderBy: { rowNumber: 'ASC' } },
    );

    batch.status = 'executing';
    batch.createdCount = 0;
    batch.updatedCount = 0;
    batch.skippedCount = 0;
    batch.failedCount = 0;
    await this.em.flush();

    for (const row of rows) {
      if (row.status !== 'ready' || !row.payload) {
        if (row.status !== 'error') {
          row.status = 'skipped';
          row.action = 'skipped';
          batch.skippedCount += 1;
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
    }

    batch.executedAt = new Date();
    batch.status = batch.failedCount > 0 ? 'executedWithErrors' : 'executed';
    await this.em.flush();

    return this.getBatch(handle);
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
    const batch = await this.em.findOne(
      ImportBatchItem,
      { handle },
      { populate: ['source', 'targetEntity', 'importTemplate', 'createdBy'] },
    );

    if (!batch) {
      throw new NotFoundException('import.batchNotFound');
    }

    return batch;
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
      mapped[targetField] = this.applyValueMapping(
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
      if (
        !targetField ||
        !template.some((field) => field.name === targetField)
      ) {
        continue;
      }

      const currentValue = payload[targetField];
      if (currentValue != null && this.normalizeScalarString(currentValue)) {
        continue;
      }

      payload[targetField] = fieldDefault.value;
    }
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

    if (!link) {
      throw new NotFoundException('import.externalReferenceNotFound');
    }

    return link.reference;
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

  private applyValueMapping(
    targetField: string,
    value: unknown,
    mappings: ImportValueMappingDto[],
  ): unknown {
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
          'import.valueMappingMissing',
          targetField,
        );
      case 'keep':
      default:
        return value;
    }
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
    const existingMappings = template.handle
      ? await this.em.find(ImportTemplateValueMappingItem, {
          importTemplate: { handle: template.handle },
        })
      : [];

    for (const existingMapping of existingMappings) {
      this.em.remove(existingMapping);
    }

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

  private assertRequiredFields(
    template: EntityTemplateDto[],
    payload: Record<string, unknown>,
    action: string | null,
  ): void {
    if (action === 'updated') {
      return;
    }

    const missingField = template.find((field) => {
      if (!field.isRequired || field.name === 'handle') {
        return false;
      }
      if (field.name.startsWith('customFields.') || field.customField) {
        return false;
      }

      const value = payload[field.name];
      return value == null || this.normalizeScalarString(value).length === 0;
    });

    if (missingField) {
      throw new BadRequestException(
        'import.requiredFieldMissing',
        missingField.name,
      );
    }
  }

  private async resolvePlannedAction(
    entityHandle: string,
    payload: Record<string, unknown>,
    sourceHandle: string | null,
    externalKeyHash: string | null,
  ): Promise<string> {
    if (sourceHandle && externalKeyHash) {
      const link = await this.em.findOne(ExternalRecordLinkItem, {
        source: { handle: sourceHandle },
        entity: { handle: entityHandle },
        externalKeyHash,
      });

      return link ? 'updated' : 'created';
    }

    return extractImportHandle(payload) == null ? 'created' : 'updated';
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
    return {
      handle: batch.handle ?? null,
      status: batch.status,
      filename: batch.filename,
      mimetype: batch.mimetype ?? null,
      fileSize: batch.fileSize ?? null,
      sourceHandle: this.extractHandle(batch.source),
      entityHandle: this.extractHandle(batch.targetEntity),
      templateHandle: this.extractNumericHandle(batch.importTemplate),
      rowCount: batch.rowCount ?? rows.length,
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
      executedAt: batch.executedAt ?? null,
      createdAt: batch.createdAt ?? null,
      updatedAt: batch.updatedAt ?? null,
      rows: rows.map((row) => ({
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
      })),
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
