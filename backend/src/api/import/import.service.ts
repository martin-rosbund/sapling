import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, type EntityName } from '@mikro-orm/core';
import { createHash } from 'crypto';
import { EntityItem } from '../../entity/EntityItem';
import { ExternalRecordLinkItem } from '../../entity/ExternalRecordLinkItem';
import { ImportBatchItem } from '../../entity/ImportBatchItem';
import { ImportBatchRowItem } from '../../entity/ImportBatchRowItem';
import { ImportSourceItem } from '../../entity/ImportSourceItem';
import { ImportTemplateItem } from '../../entity/ImportTemplateItem';
import { PersonItem } from '../../entity/PersonItem';
import { GenericService } from '../generic/generic.service';
import {
  extractImportHandle,
  getImportErrorMessage,
  normalizeImportRow,
} from '../generic/generic-import.util';
import { GenericQueryService } from '../generic/generic-query.service';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { parseCsvText } from './import-csv.util';
import type {
  ConfigureImportBatchDto,
  ImportBatchSummaryDto,
  ImportGenericReferenceMappingDto,
  ImportTemplateSummaryDto,
  ImportRelationMappingDto,
  SaveImportTemplateDto,
} from './import.types';

type ExternalKey = {
  hash: string;
  parts: Record<string, unknown>;
};

const SAMPLE_ROW_LIMIT = 5;
const RESPONSE_ROW_LIMIT = 200;

@Injectable()
export class ImportService {
  constructor(
    private readonly em: EntityManager,
    private readonly genericService: GenericService,
    private readonly genericQueryService: GenericQueryService,
    private readonly templateService: TemplateService,
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
      ? await this.em.findOne(ImportTemplateItem, {
          handle: templateHandle,
          ...(source ? { source: { handle: source.handle } } : {}),
          targetEntity: { handle: entityHandle },
        })
      : null;

    if (templateHandle && !importTemplate) {
      throw new NotFoundException('import.templateNotFound');
    }

    batch.targetEntity = targetEntity;
    batch.source = source;
    batch.importTemplate = importTemplate;
    batch.mapping = {
      mappings: dto.mappings ?? [],
      relationMappings: dto.relationMappings ?? [],
    };
    batch.externalKeyColumns = keyColumns;
    batch.genericReferenceMapping = dto.genericReferenceMapping ?? null;
    batch.status = 'validating';

    const rows = await this.em.find(
      ImportBatchRowItem,
      { batch: { handle: batch.handle } },
      { orderBy: { rowNumber: 'ASC' } },
    );
    const template = this.templateService.getEntityTemplate(entityHandle);
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
          dto,
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
      populate: ['source', 'targetEntity'],
      orderBy: { title: 'ASC' },
    });

    return templates.map((template) => this.toTemplateSummary(template));
  }

  async saveTemplate(
    dto: SaveImportTemplateDto,
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

    const handle =
      typeof dto.handle === 'number' && Number.isFinite(dto.handle)
        ? Math.trunc(dto.handle)
        : null;
    const template = handle
      ? await this.em.findOne(
          ImportTemplateItem,
          { handle },
          { populate: ['source', 'targetEntity'] },
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
      relationMappings: dto.relationMappings ?? [],
    };
    template.externalKeyColumns = this.normalizeColumns(dto.keyColumns ?? []);
    template.genericReferenceMapping = dto.genericReferenceMapping ?? null;

    await this.em.flush();
    return this.toTemplateSummary(template);
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
      mapped[targetField] = rawData[sourceColumn] ?? '';
    }

    const payload = normalizeImportRow(template, mapped);
    await this.applyRelationMappings(
      template,
      payload,
      rawData,
      dto.relationMappings ?? [],
    );
    await this.applyGenericReferenceMapping(
      template,
      payload,
      rawData,
      entityHandle,
      dto.genericReferenceMapping ?? null,
    );
    this.applyCurrentPersonDefaults(template, payload, currentUser);

    return payload;
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
    const normalizedValue = String(value ?? '').trim();
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
      entityClass as EntityName<object>,
      { [valueField.name]: normalizedValue },
      { limit: 2 },
    );

    if (matches.length !== 1) {
      throw new NotFoundException('import.referenceValueNotUnique');
    }

    return this.extractResultHandle(matches[0]);
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

      const value = payload[field.name];
      return value == null || String(value).trim().length === 0;
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
        String(rawData[column] ?? '').trim(),
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
      mapping: template.mapping,
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
