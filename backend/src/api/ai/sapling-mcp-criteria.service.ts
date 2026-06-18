import { ForbiddenException, Injectable } from '@nestjs/common';
import { TemplateService } from '../template/template.service';
import type { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { SAPLING_MCP_USAGE_HINTS } from './prompts/sapling-mcp.prompts';
import { SaplingMcpCriteriaRepairRequest } from './sapling-mcp-criteria.types';
import type { SaplingMcpCriteriaMode } from './sapling-mcp-criteria.types';

@Injectable()
export class SaplingMcpCriteriaService {
  constructor(private readonly templateService: TemplateService) {}

  normalizeEntityCriteria(
    entityHandle: string,
    criteria: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.normalizeCriteriaValue(
      entityHandle,
      criteria,
      'filter',
    ) as Record<string, unknown>;
  }

  normalizeEntitySort(
    entityHandle: string,
    orderBy: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.normalizeCriteriaValue(
      entityHandle,
      orderBy,
      'orderBy',
    ) as Record<string, unknown>;
  }

  normalizeEntityRelations(
    entityHandle: string,
    relations: string[],
  ): string[] {
    if (relations.length === 0) {
      return [];
    }

    const relationNames = new Set(this.getRelationNames(entityHandle));

    return relations.filter((relation) => relationNames.has(relation));
  }

  createCriteriaRepairResult(
    entityHandle: string,
    repair: SaplingMcpCriteriaRepairRequest,
  ): Record<string, unknown> {
    const invalidFields = repair.invalidFields.map((field) => {
      const suggestedFields = this.suggestCriteriaFields(
        field.entityHandle,
        field.fieldName,
      );

      return {
        ...field,
        suggestedFields,
        validFields: this.getValidCriteriaFieldNames(field.entityHandle),
        relationNames: this.getRelationNames(field.entityHandle),
      };
    });

    return {
      entityHandle,
      queryExecuted: false,
      status: 'needs_schema_retry',
      invalidFields,
      suggestedFields: this.uniqueStrings(
        invalidFields.flatMap((field) => field.suggestedFields),
      ),
      validFields: this.getValidCriteriaFieldNames(entityHandle),
      relationNames: this.getRelationNames(entityHandle),
      filterOperators: this.getFilterOperators(),
      usageHints: [
        ...SAPLING_MCP_USAGE_HINTS.criteriaRepair,
        ...SAPLING_MCP_USAGE_HINTS.entitySchema,
      ],
    };
  }

  getFilterOperators(): string[] {
    return [
      '$eq',
      '$ne',
      '$gt',
      '$gte',
      '$lt',
      '$lte',
      '$in',
      '$nin',
      '$like',
      '$ilike',
      '$or',
      '$and',
    ];
  }

  private normalizeCriteriaValue(
    entityHandle: string,
    value: unknown,
    mode: SaplingMcpCriteriaMode,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.normalizeCriteriaValue(entityHandle, item, mode),
      );
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const record = value as Record<string, unknown>;
    const normalizedRecord: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(record)) {
      const normalizedKey = this.normalizeOperatorKey(rawKey);

      if (normalizedKey === '$or' || normalizedKey === '$and') {
        normalizedRecord[normalizedKey] = Array.isArray(rawValue)
          ? rawValue.map((item) =>
              this.normalizeCriteriaValue(entityHandle, item, mode),
            )
          : [];
        continue;
      }

      if (this.isOperatorKey(normalizedKey)) {
        normalizedRecord[normalizedKey] = this.normalizeCriteriaValue(
          entityHandle,
          rawValue,
          mode,
        );
        continue;
      }

      if (normalizedKey.includes('.')) {
        this.mergeNormalizedRecord(
          normalizedRecord,
          this.normalizeDottedCriteria(
            entityHandle,
            normalizedKey,
            rawValue,
            mode,
          ),
        );
        continue;
      }

      const field = this.getEntityField(entityHandle, normalizedKey);

      if (!field) {
        this.assertNotSecurityField(entityHandle, normalizedKey);
        throw new SaplingMcpCriteriaRepairRequest([
          {
            entityHandle,
            fieldPath: normalizedKey,
            fieldName: normalizedKey,
            mode,
            reason: 'unknownField',
          },
        ]);
      }

      if (mode === 'orderBy' && typeof rawValue === 'string') {
        normalizedRecord[normalizedKey] = rawValue;
        continue;
      }

      if (
        field.isReference &&
        field.referenceName &&
        rawValue &&
        typeof rawValue === 'object' &&
        !Array.isArray(rawValue)
      ) {
        const relationRecord = rawValue as Record<string, unknown>;
        const relationKeys = Object.keys(relationRecord).map((key) =>
          this.normalizeOperatorKey(key),
        );
        const containsOnlyOperators =
          relationKeys.length > 0 &&
          relationKeys.every((key) => this.isOperatorKey(key));

        normalizedRecord[normalizedKey] = containsOnlyOperators
          ? this.normalizeCriteriaValue(entityHandle, relationRecord, mode)
          : this.normalizeCriteriaValue(
              field.referenceName,
              relationRecord,
              mode,
            );
        continue;
      }

      normalizedRecord[normalizedKey] = this.normalizeCriteriaValue(
        entityHandle,
        rawValue,
        mode,
      );
    }

    return normalizedRecord;
  }

  private normalizeDottedCriteria(
    entityHandle: string,
    dottedKey: string,
    rawValue: unknown,
    mode: SaplingMcpCriteriaMode,
  ): Record<string, unknown> {
    const [head, ...rest] = dottedKey
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!head || rest.length === 0) {
      throw new SaplingMcpCriteriaRepairRequest([
        {
          entityHandle,
          fieldPath: dottedKey,
          fieldName: head || dottedKey,
          mode,
          reason: 'invalidRelationPath',
        },
      ]);
    }

    const field = this.getEntityField(entityHandle, head);

    if (!field || !field.isReference || !field.referenceName) {
      this.assertNotSecurityField(entityHandle, head);
      throw new SaplingMcpCriteriaRepairRequest([
        {
          entityHandle,
          fieldPath: dottedKey,
          fieldName: head,
          mode,
          reason: 'invalidRelationPath',
        },
      ]);
    }

    try {
      return {
        [head]: this.normalizeCriteriaValue(
          field.referenceName,
          { [rest.join('.')]: rawValue },
          mode,
        ),
      };
    } catch (error) {
      if (error instanceof SaplingMcpCriteriaRepairRequest) {
        throw new SaplingMcpCriteriaRepairRequest(
          error.invalidFields.map((invalidField) => ({
            ...invalidField,
            fieldPath: `${head}.${invalidField.fieldPath}`,
          })),
        );
      }

      throw error;
    }
  }

  private mergeNormalizedRecord(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(source)) {
      const existingValue = target[key];

      if (
        existingValue &&
        typeof existingValue === 'object' &&
        !Array.isArray(existingValue) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.mergeNormalizedRecord(
          existingValue as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }

      target[key] = value;
    }
  }

  private normalizeOperatorKey(key: string): string {
    const normalized = key.trim();

    switch (normalized) {
      case 'eq':
        return '$eq';
      case 'ne':
        return '$ne';
      case 'gt':
        return '$gt';
      case 'gte':
        return '$gte';
      case 'lt':
        return '$lt';
      case 'lte':
        return '$lte';
      case 'in':
        return '$in';
      case 'nin':
        return '$nin';
      case 'like':
        return '$like';
      case 'ilike':
        return '$ilike';
      case 'or':
        return '$or';
      case 'and':
        return '$and';
      default:
        return normalized;
    }
  }

  private isOperatorKey(key: string): boolean {
    return this.getFilterOperators().includes(key);
  }

  private getEntityField(
    entityHandle: string,
    fieldName: string,
  ): EntityTemplateDto | null {
    return (
      this.getEntityTemplate(entityHandle).find(
        (field) => field.name === fieldName,
      ) ?? null
    );
  }

  private getEntityTemplate(entityHandle: string): EntityTemplateDto[] {
    return this.getRawEntityTemplate(entityHandle).filter(
      (field) => !field.options?.includes('isSecurity'),
    );
  }

  private getValidCriteriaFieldNames(entityHandle: string): string[] {
    return this.getEntityTemplate(entityHandle).map((field) => field.name);
  }

  private getRelationNames(entityHandle: string): string[] {
    return this.getEntityTemplate(entityHandle)
      .filter((field) => field.isReference)
      .map((field) => field.name);
  }

  private assertNotSecurityField(
    entityHandle: string,
    fieldName: string,
  ): void {
    const securityField = this.getRawEntityTemplate(entityHandle).find(
      (field) =>
        field.name === fieldName && field.options?.includes('isSecurity'),
    );

    if (securityField) {
      throw new ForbiddenException('global.permissionDenied');
    }
  }

  private suggestCriteriaFields(
    entityHandle: string,
    invalidFieldName: string,
  ): string[] {
    const template = this.getEntityTemplate(entityHandle);
    const fieldNames = template.map((field) => field.name);
    const fieldNameSet = new Set(fieldNames);
    const suggestions: string[] = [];
    const normalizedInvalidFieldName = invalidFieldName.toLowerCase();

    if (
      ['title', 'name', 'label', 'display', 'displayvalue'].includes(
        normalizedInvalidFieldName,
      )
    ) {
      suggestions.push(
        ...template
          .filter((field) => field.options?.includes('isValue'))
          .map((field) => field.name),
      );

      for (const fallback of [
        'title',
        'name',
        'description',
        'number',
        'externalNumber',
        'subject',
        'email',
        'handle',
      ]) {
        if (fieldNameSet.has(fallback)) {
          suggestions.push(fallback);
        }
      }
    }

    suggestions.push(
      ...fieldNames
        .map((fieldName) => ({
          fieldName,
          score: this.scoreCriteriaFieldSuggestion(
            normalizedInvalidFieldName,
            fieldName,
          ),
        }))
        .filter((item) => item.score > 0)
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.fieldName.localeCompare(right.fieldName),
        )
        .map((item) => item.fieldName),
    );

    return this.uniqueStrings(suggestions).slice(0, 6);
  }

  private scoreCriteriaFieldSuggestion(
    normalizedInvalidFieldName: string,
    candidateFieldName: string,
  ): number {
    const candidate = candidateFieldName.toLowerCase();

    if (!normalizedInvalidFieldName || !candidate) {
      return 0;
    }

    if (candidate === normalizedInvalidFieldName) {
      return 100;
    }

    if (candidate.startsWith(normalizedInvalidFieldName)) {
      return 80;
    }

    if (candidate.includes(normalizedInvalidFieldName)) {
      return 70;
    }

    if (normalizedInvalidFieldName.includes(candidate)) {
      return 50;
    }

    const matchingCharacters = [...new Set(normalizedInvalidFieldName)].filter(
      (character) => candidate.includes(character),
    ).length;
    const ratio =
      matchingCharacters /
      Math.max(normalizedInvalidFieldName.length, candidate.length);

    return ratio >= 0.5 ? Math.round(ratio * 40) : 0;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => !!value?.trim()))];
  }

  private getRawEntityTemplate(entityHandle: string): EntityTemplateDto[] {
    return this.templateService.getEntityTemplate(entityHandle);
  }
}
