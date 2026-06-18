import { Injectable } from '@nestjs/common';
import { TemplateService } from '../template/template.service';
import type { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { SAPLING_MCP_USAGE_HINTS } from './prompts/sapling-mcp.prompts';

@Injectable()
export class SaplingMcpResultFormatterService {
  constructor(private readonly templateService: TemplateService) {}

  createModelResult(
    toolName: string,
    payload: unknown,
    args: Record<string, unknown>,
  ): unknown {
    if (this.isToolErrorPayload(payload)) {
      return payload;
    }

    switch (toolName) {
      case 'current_person':
        return this.sanitizeUnknownValue(payload);
      case 'generic_list':
      case 'ticket_search':
        return this.createModelListResult(payload, args);
      case 'generic_get':
        return this.createModelGetResult(payload);
      case 'semantic_search':
        return this.createModelSemanticSearchResult(payload);
      case 'knowledge_search':
        return this.createModelKnowledgeSearchResult(payload);
      case 'import_get_batch':
      case 'import_suggest_mapping':
      case 'import_configure_batch':
      case 'import_execute_batch':
        return this.createModelImportBatchResult(payload);
      case 'import_list_templates':
        return this.createModelImportTemplateListResult(payload);
      case 'import_match_existing_records':
        return this.createModelImportMatchResult(payload);
      case 'generic_create':
      case 'generic_update':
        return this.createModelMutationResult(payload, args);
      case 'generic_delete':
        return this.createModelDeleteResult(payload);
      case 'generic_timeline':
        return this.sanitizeUnknownValue(payload);
      default:
        return payload;
    }
  }

  private createModelListResult(
    payload: unknown,
    args: Record<string, unknown>,
  ): unknown {
    const record = this.asRecord(payload);
    const entityHandle =
      this.asStringValue(record.entityHandle) ??
      this.asStringValue(args.entityHandle);

    if (!entityHandle) {
      return this.sanitizeUnknownValue(payload);
    }

    return {
      ...this.copyModelResultMetadata(record, [
        'entityHandle',
        'query',
        'queryExecuted',
        'status',
        'invalidFields',
        'suggestedFields',
        'validFields',
        'relationNames',
        'filterOperators',
        'searchMode',
        'searchFields',
        'meta',
        'usageHints',
      ]),
      entityHandle,
      data: Array.isArray(record.data)
        ? record.data.map((item) =>
            this.sanitizeEntityRecord(entityHandle, item),
          )
        : [],
    };
  }

  private createModelGetResult(payload: unknown): unknown {
    const record = this.asRecord(payload);
    const entityHandle = this.asStringValue(record.entityHandle);
    const sourceRecord = this.asEntityRecord(record.record);

    if (!entityHandle || !sourceRecord) {
      return this.sanitizeUnknownValue(payload);
    }

    return {
      entityHandle,
      handle:
        this.asResultHandle(record.handle) ??
        this.asResultHandle(sourceRecord.handle),
      found: record.found === true,
      displayValue: this.buildRecordDisplayValue(entityHandle, sourceRecord),
      record: this.sanitizeEntityRecord(entityHandle, sourceRecord),
      usageHints: [
        ...SAPLING_MCP_USAGE_HINTS.genericGet,
        ...SAPLING_MCP_USAGE_HINTS.userFacingValues,
      ],
    };
  }

  private createModelSemanticSearchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);
    const entityHandle = this.asStringValue(record.entityHandle);

    if (!entityHandle) {
      return this.sanitizeUnknownValue(payload);
    }

    return {
      ...this.copyModelResultMetadata(record, [
        'entityHandle',
        'query',
        'indexed',
        'searchableSections',
        'usageHints',
      ]),
      results: this.sanitizeSearchResults(entityHandle, record.results),
    };
  }

  private createModelKnowledgeSearchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);
    const results = Array.isArray(record.results) ? record.results : [];

    return {
      ...this.copyModelResultMetadata(record, [
        'query',
        'entityHandles',
        'indexedEntityHandles',
        'unindexedEntityHandles',
        'skippedEntityHandles',
        'errors',
        'usageHints',
      ]),
      results: results
        .map((item) => {
          const result = this.asRecord(item);
          const entityHandle = this.asStringValue(result.entityHandle);
          const sourceRecord = this.asEntityRecord(result.record);

          if (!entityHandle) {
            return this.sanitizeUnknownValue(item);
          }

          return {
            entityHandle,
            handle:
              this.asResultHandle(result.handle) ??
              this.asResultHandle(sourceRecord?.handle),
            score: this.asScore(result.score),
            displayValue: sourceRecord
              ? this.buildRecordDisplayValue(entityHandle, sourceRecord)
              : null,
            record: sourceRecord
              ? this.sanitizeEntityRecord(entityHandle, sourceRecord)
              : null,
            matches: this.sanitizeUnknownValue(result.matches),
          };
        })
        .filter((item) => item != null),
    };
  }

  private createModelImportBatchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);

    return {
      ...this.copyModelResultMetadata(record, [
        'handle',
        'status',
        'filename',
        'mimetype',
        'fileSize',
        'sourceHandle',
        'entityHandle',
        'templateHandle',
        'rowCount',
        'readyCount',
        'errorCount',
        'createdCount',
        'updatedCount',
        'skippedCount',
        'failedCount',
        'delimiter',
        'headers',
        'sampleRows',
        'mapping',
        'externalKeyColumns',
        'genericReferenceMapping',
        'executedAt',
        'warnings',
        'providerHandle',
        'modelHandle',
      ]),
      rows: Array.isArray(record.rows)
        ? record.rows.slice(0, 20).map((row) => this.sanitizeUnknownValue(row))
        : [],
      usageHints: [...SAPLING_MCP_USAGE_HINTS.importTools],
    };
  }

  private createModelImportTemplateListResult(payload: unknown): unknown {
    const templates = Array.isArray(payload) ? payload : [];

    return {
      templates: templates.map((template) =>
        this.sanitizeUnknownValue(template),
      ),
      usageHints: [...SAPLING_MCP_USAGE_HINTS.importTools],
    };
  }

  private createModelImportMatchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);

    return {
      ...this.copyModelResultMetadata(record, [
        'batchHandle',
        'entityHandle',
        'sourceColumns',
        'targetFields',
        'sampledRows',
        'checkedValues',
        'matchCount',
      ]),
      matches: Array.isArray(record.matches)
        ? record.matches.map((item) => this.sanitizeUnknownValue(item))
        : [],
      usageHints: [...SAPLING_MCP_USAGE_HINTS.importTools],
    };
  }

  private createModelMutationResult(
    payload: unknown,
    args: Record<string, unknown>,
  ): unknown {
    const record = this.asRecord(payload);
    const entityHandle =
      this.asStringValue(record.entityHandle) ??
      this.asStringValue(args.entityHandle);

    if (!entityHandle) {
      return this.sanitizeUnknownValue(payload);
    }

    return this.sanitizeEntityRecord(entityHandle, record);
  }

  private createModelDeleteResult(payload: unknown): unknown {
    const record = this.asRecord(payload);

    return {
      success: record.success === true,
      entityHandle: this.asStringValue(record.entityHandle),
      usageHints: [...SAPLING_MCP_USAGE_HINTS.userFacingValues],
    };
  }

  private sanitizeSearchResults(
    entityHandle: string,
    value: unknown,
  ): unknown[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        const result = this.asRecord(item);
        const sourceRecord = this.asEntityRecord(result.record);

        return {
          handle:
            this.asResultHandle(result.handle) ??
            this.asResultHandle(sourceRecord?.handle),
          score: this.asScore(result.score),
          displayValue: sourceRecord
            ? this.buildRecordDisplayValue(entityHandle, sourceRecord)
            : null,
          record: sourceRecord
            ? this.sanitizeEntityRecord(entityHandle, sourceRecord)
            : null,
          matches: this.sanitizeUnknownValue(result.matches),
        };
      })
      .filter((item) => item.record != null || item.displayValue != null);
  }

  private sanitizeEntityRecord(entityHandle: string, value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeEntityRecord(entityHandle, item));
    }

    const record = this.asEntityRecord(value);

    if (!record) {
      return this.sanitizeUnknownValue(value);
    }

    const template = this.getEntityTemplate(entityHandle);
    const fieldsByName = new Map(template.map((field) => [field.name, field]));
    const sanitizedRecord: Record<string, unknown> = {};
    const displayValue = this.buildRecordDisplayValue(entityHandle, record);

    if (displayValue) {
      sanitizedRecord.displayValue = displayValue;
    }

    for (const [key, rawValue] of Object.entries(record)) {
      const field = fieldsByName.get(key);

      if (
        this.isInternalIdentifierKey(key) ||
        (field?.isPrimaryKey && key !== 'handle')
      ) {
        continue;
      }

      if (field?.options?.includes('isSecurity')) {
        continue;
      }

      if (field?.isReference && field.referenceName) {
        sanitizedRecord[key] = this.sanitizeEntityRecord(
          field.referenceName,
          rawValue,
        );
        continue;
      }

      sanitizedRecord[key] = this.sanitizeUnknownValue(rawValue);
    }

    return sanitizedRecord;
  }

  private sanitizeUnknownValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeUnknownValue(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const record = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};

    for (const [key, rawValue] of Object.entries(record)) {
      if (this.isInternalIdentifierKey(key)) {
        continue;
      }

      sanitizedRecord[key] = this.sanitizeUnknownValue(rawValue);
    }

    return sanitizedRecord;
  }

  private buildRecordDisplayValue(
    entityHandle: string,
    record: Record<string, unknown>,
  ): string | null {
    const template = this.getEntityTemplate(entityHandle);
    const valueFieldNames = template
      .filter((field) => field.options?.includes('isValue'))
      .map((field) => field.name);
    const valueParts = valueFieldNames
      .map((fieldName) => this.formatDisplayValuePart(record[fieldName]))
      .filter((part): part is string => !!part);

    if (valueParts.length > 0) {
      return valueParts.join(' ');
    }

    const fallbackParts = [
      this.formatDisplayValuePart(record.title),
      this.formatDisplayValuePart(record.name),
      this.formatDisplayValuePart(record.number),
      this.formatDisplayValuePart(record.description),
      this.formatDisplayValuePart(record.subject),
      this.formatPersonDisplayValue(record),
      this.formatDisplayValuePart(record.email),
    ].filter((part): part is string => !!part);

    return fallbackParts[0] ?? null;
  }

  private formatPersonDisplayValue(
    record: Record<string, unknown>,
  ): string | null {
    const name = [
      this.formatDisplayValuePart(record.firstName),
      this.formatDisplayValuePart(record.lastName),
    ]
      .filter((part): part is string => !!part)
      .join(' ')
      .trim();

    return name || null;
  }

  private formatDisplayValuePart(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      const normalized = String(value).trim();
      return normalized || null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return null;
  }

  private copyModelResultMetadata(
    record: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    for (const key of keys) {
      if (key in record) {
        metadata[key] = this.sanitizeUnknownValue(record[key]);
      }
    }

    const usageHints = metadata.usageHints;
    if (Array.isArray(usageHints)) {
      const normalizedUsageHints = usageHints.filter(
        (hint): hint is unknown => typeof hint !== 'undefined',
      );
      metadata.usageHints = [
        ...normalizedUsageHints,
        ...SAPLING_MCP_USAGE_HINTS.userFacingValues,
      ];
    }

    return metadata;
  }

  private isToolErrorPayload(payload: unknown): boolean {
    return !!(
      payload &&
      typeof payload === 'object' &&
      (payload as { ok?: unknown }).ok === false
    );
  }

  private isInternalIdentifierKey(key: string): boolean {
    return (
      key === 'id' ||
      key.endsWith('Handle') ||
      key.endsWith('Id') ||
      key.endsWith('_handle') ||
      key.endsWith('_id')
    );
  }

  private asStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private asResultHandle(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return null;
  }

  private asEntityRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asScore(value: unknown): number {
    const score = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(score) ? score : 0;
  }

  private getEntityTemplate(entityHandle: string): EntityTemplateDto[] {
    return this.templateService
      .getEntityTemplate(entityHandle)
      .filter((field) => !field.options?.includes('isSecurity'));
  }
}
