import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityName } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';

const entityMap = ENTITY_MAP;

@Injectable()
export class GenericQueryService {
  constructor(private readonly templateService: TemplateService) {}

  getEntityClass<T = object>(entityHandle: string): EntityName<T> {
    const entityClass = entityMap[entityHandle] as EntityName<T> | undefined;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    return entityClass;
  }

  buildPopulate(relations: string[], template: EntityTemplateDto[]): string[] {
    const populate: string[] = [];

    if (relations.includes('*')) {
      const refs: string[] = template
        .filter((x) => !!x.isReference)
        .map((x) => x.name);
      populate.push(...refs);
    } else {
      if (relations.includes('1:m')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === '1:m')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('m:1')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'm:1')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('m:n')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'm:n')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('n:m')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'n:m')
          .map((x) => x.name);
        populate.push(...refs);
      }

      const namedRefs: string[] = relations.filter((relation) => {
        return template.some((field) => {
          return (
            !!field.isReference &&
            (relation === field.name || relation.startsWith(`${field.name}.`))
          );
        });
      });
      populate.push(...namedRefs);
    }

    return [...new Set(populate)];
  }

  normalizeQueryCriteria(
    entityHandle: string,
    criteria: object,
    mode: 'filter' | 'orderBy',
  ): object {
    if (!this.isPlainRecord(criteria)) {
      return criteria;
    }

    const normalizedRecord: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(criteria)) {
      const normalizedKey = rawKey.trim();

      if (!normalizedKey) {
        continue;
      }

      if (normalizedKey.startsWith('$')) {
        if (Array.isArray(rawValue)) {
          const operatorValues = rawValue as unknown[];
          normalizedRecord[normalizedKey] = operatorValues.map((item) =>
            this.isPlainRecord(item)
              ? this.normalizeQueryCriteria(entityHandle, item, mode)
              : item,
          );
        } else {
          normalizedRecord[normalizedKey] = rawValue;
        }

        continue;
      }

      if (normalizedKey.includes('.')) {
        this.mergeNormalizedRecord(
          normalizedRecord,
          this.normalizeDottedQueryCriteria(
            entityHandle,
            normalizedKey,
            rawValue,
            mode,
          ),
        );
        continue;
      }

      const field = this.getTemplateField(entityHandle, normalizedKey);

      if (field?.isReference && field.referenceName && mode === 'filter') {
        normalizedRecord[normalizedKey] = this.normalizeReferenceCriteriaValue(
          field,
          rawValue,
          mode,
        );
        continue;
      }

      normalizedRecord[normalizedKey] =
        mode === 'filter'
          ? this.normalizeFieldCriteriaValue(field, rawValue)
          : rawValue;
    }

    return normalizedRecord;
  }

  collectQueryPopulateRelations(
    entityHandle: string,
    criteria: unknown,
  ): string[] {
    if (!this.isPlainRecord(criteria)) {
      return [];
    }

    const relations = new Set<string>();

    for (const [key, value] of Object.entries(criteria)) {
      if (key.startsWith('$')) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            this.collectQueryPopulateRelations(entityHandle, item).forEach(
              (relation) => relations.add(relation),
            );
          });
        }
        continue;
      }

      const field = this.getTemplateField(entityHandle, key);

      if (
        !field?.isReference ||
        !field.referenceName ||
        !this.isPlainRecord(value)
      ) {
        continue;
      }

      const nestedKeys = Object.keys(value).map((nestedKey) =>
        nestedKey.trim(),
      );
      const containsOnlyOperators =
        nestedKeys.length > 0 &&
        nestedKeys.every((nestedKey) => this.isQueryOperatorKey(nestedKey));

      if (containsOnlyOperators) {
        continue;
      }

      relations.add(key);
      this.collectQueryPopulateRelations(field.referenceName, value).forEach(
        (relation) => relations.add(`${key}.${relation}`),
      );
    }

    return [...relations];
  }

  private normalizeDottedQueryCriteria(
    entityHandle: string,
    dottedKey: string,
    rawValue: unknown,
    mode: 'filter' | 'orderBy',
  ): Record<string, unknown> {
    const [head, ...rest] = dottedKey
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!head || rest.length === 0) {
      throw new BadRequestException(
        'exception.badRequest',
        `Invalid ${mode} field "${dottedKey}"`,
      );
    }

    const field = this.getTemplateField(entityHandle, head);

    if (!field?.isReference || !field.referenceName) {
      throw new BadRequestException(
        'exception.badRequest',
        `Invalid ${mode} field "${dottedKey}"`,
      );
    }

    return {
      [head]: this.normalizeQueryCriteria(
        field.referenceName,
        { [rest.join('.')]: rawValue },
        mode,
      ),
    };
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

  private normalizeReferenceOperatorCriteria(
    field: EntityTemplateDto,
    relationRecord: Record<string, unknown>,
    mode: 'filter' | 'orderBy',
  ): Record<string, unknown> {
    if (mode !== 'filter') {
      return relationRecord;
    }

    const identifierKeys = this.getReferenceIdentifierKeys(field);
    if (identifierKeys.length !== 1) {
      return relationRecord;
    }

    return {
      [identifierKeys[0]]: this.normalizeFieldCriteriaValue(
        this.getTemplateField(field.referenceName, identifierKeys[0]),
        relationRecord,
      ),
    };
  }

  private normalizeReferenceCriteriaValue(
    field: EntityTemplateDto,
    rawValue: unknown,
    mode: 'filter' | 'orderBy',
  ): unknown {
    if (!field.referenceName) {
      return rawValue;
    }

    if (this.isPlainRecord(rawValue)) {
      const relationRecord = rawValue;
      const relationKeys = Object.keys(relationRecord).map((key) => key.trim());
      const containsOnlyOperators =
        relationKeys.length > 0 &&
        relationKeys.every((key) => this.isQueryOperatorKey(key));

      return containsOnlyOperators
        ? this.normalizeReferenceOperatorCriteria(field, relationRecord, mode)
        : this.normalizeQueryCriteria(
            field.referenceName,
            relationRecord,
            mode,
          );
    }

    const identifierField = this.getSingleReferenceIdentifierField(field);
    if (!identifierField) {
      return rawValue;
    }

    return {
      [identifierField.name]: this.normalizeFieldCriteriaValue(
        identifierField,
        rawValue,
      ),
    };
  }

  private getReferenceIdentifierKeys(field: EntityTemplateDto): string[] {
    if (field.referencedPks.length > 0) {
      return field.referencedPks;
    }

    if (!field.referenceName) {
      return [];
    }

    const referenceTemplate = this.templateService.getEntityTemplate(
      field.referenceName,
    );

    return ['handle', 'id'].filter((key) =>
      referenceTemplate.some((templateField) => templateField.name === key),
    );
  }

  private getSingleReferenceIdentifierField(
    field: EntityTemplateDto,
  ): EntityTemplateDto | null {
    if (!field.referenceName) {
      return null;
    }

    const identifierKeys = this.getReferenceIdentifierKeys(field);
    if (identifierKeys.length !== 1) {
      return null;
    }

    return (
      this.getTemplateField(field.referenceName, identifierKeys[0]) ?? null
    );
  }

  private normalizeFieldCriteriaValue(
    field: EntityTemplateDto | undefined,
    value: unknown,
  ): unknown {
    if (!field) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeFieldCriteriaValue(field, item));
    }

    if (!this.isPlainRecord(value)) {
      return this.normalizeScalarCriteriaValue(field, value);
    }

    const normalizedRecord: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(value)) {
      const normalizedKey = rawKey.trim();
      normalizedRecord[normalizedKey] = this.isQueryOperatorKey(normalizedKey)
        ? this.normalizeFieldCriteriaValue(field, rawValue)
        : rawValue;
    }

    return normalizedRecord;
  }

  private normalizeScalarCriteriaValue(
    field: EntityTemplateDto,
    value: unknown,
  ): unknown {
    if (value == null) {
      return value;
    }

    if (field.type === 'number' && typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return value;
      }

      const parsedValue = Number(trimmedValue);
      return Number.isNaN(parsedValue) ? value : parsedValue;
    }

    if (
      field.type === 'string' &&
      (typeof value === 'number' || typeof value === 'boolean')
    ) {
      return String(value);
    }

    if (field.type === 'boolean' && typeof value === 'string') {
      const trimmedValue = value.trim().toLowerCase();
      if (trimmedValue === 'true') {
        return true;
      }
      if (trimmedValue === 'false') {
        return false;
      }
    }

    return value;
  }

  private getTemplateField(
    entityHandle: string,
    fieldName: string,
  ): EntityTemplateDto | undefined {
    return this.templateService
      .getEntityTemplate(entityHandle)
      .find((field) => field.name === fieldName);
  }

  private isQueryOperatorKey(key: string): boolean {
    return key.startsWith('$');
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
