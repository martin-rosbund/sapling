import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';

@Injectable()
export class GenericFilterService {
  prepareReadCriteria<T>(obj: T, template: EntityTemplateDto[] = []): T {
    const stringFields = template
      .filter((field) => field.type === 'string')
      .map((field) => field.name)
      .filter((name): name is string => typeof name === 'string');

    const filteredCriteria = this.filterNonStringLike(obj, stringFields);
    return this.convertDateStrings(filteredCriteria, template);
  }

  normalizeDatePayload<T extends Record<string, any>>(
    data: T,
    template: EntityTemplateDto[] = [],
  ): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const dateFields = new Set(
      template
        .filter((field) =>
          ['date', 'datetime', 'DateType'].includes(field.type),
        )
        .map((field) => field.name)
        .filter((name): name is string => typeof name === 'string'),
    );
    const record = data as Record<string, any>;

    for (const key of Object.keys(record)) {
      if (!dateFields.has(key)) {
        continue;
      }

      const normalizedValue = this.normalizeDatePayloadValue(record[key]);
      if (typeof normalizedValue !== 'undefined') {
        record[key] = normalizedValue;
      }
    }

    return data;
  }

  private filterNonStringLike<T>(obj: T, stringFields: string[]): T {
    this.normalizeLikeOperators(obj);

    if (Array.isArray(obj)) {
      (obj as unknown[]).forEach((item) => {
        this.filterNonStringLike(item, stringFields);
      });
      return obj;
    }

    if (typeof obj === 'object' && obj !== null) {
      const record = obj as Record<string, unknown>;

      for (const logicalOperator of ['$or', '$and']) {
        if (logicalOperator in record) {
          const logicalValue = record[logicalOperator];

          if (!Array.isArray(logicalValue) || logicalValue.length === 0) {
            throw new BadRequestException(
              'exception.badRequest',
              `${logicalOperator} must be a non-empty array`,
            );
          }

          logicalValue.forEach((condition: object) => {
            this.filterNonStringLike(condition, stringFields);
          });
        }
      }

      for (const key of Object.keys(record)) {
        const value = record[key];

        if (
          typeof value === 'object' &&
          value !== null &&
          '$ilike' in value &&
          !stringFields.includes(key)
        ) {
          throw new BadRequestException(
            'exception.badRequest',
            `$ilike is only allowed on string fields`,
          );
        }
      }
    }

    return obj;
  }

  private normalizeLikeOperators(obj: unknown): void {
    if (Array.isArray(obj)) {
      obj.forEach((item) => this.normalizeLikeOperators(item));
      return;
    }

    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    const record = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (key === '$like') {
        record.$ilike = value;
        delete record.$like;
        continue;
      }

      this.normalizeLikeOperators(value);
    }
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private convertDateStrings<T>(obj: T, template: EntityTemplateDto[] = []): T {
    if (Array.isArray(obj)) {
      return (obj as unknown[]).map((item) =>
        this.isPlainRecord(item)
          ? this.convertDateStrings(item, template)
          : item,
      ) as T;
    }

    if (!this.isPlainRecord(obj)) {
      return obj;
    }

    const dateFields = new Set(
      template
        .filter((field) =>
          ['date', 'datetime', 'DateType'].includes(field.type),
        )
        .map((field) => field.name),
    );

    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const isDateField = dateFields.has(key);
      const normalizedValue = isDateField
        ? this.normalizeDateFilterValue(record[key])
        : null;

      if (normalizedValue) {
        record[key] = normalizedValue;
      } else if (this.isPlainRecord(record[key])) {
        const operatorRecord = record[key];

        for (const op of ['$gte', '$lte', '$gt', '$lt', '$eq']) {
          if (!isDateField || typeof operatorRecord[op] === 'undefined') {
            continue;
          }

          const normalizedOperatorValue = this.normalizeDateFilterValue(
            operatorRecord[op],
          );

          if (normalizedOperatorValue) {
            operatorRecord[op] = normalizedOperatorValue;
          }
        }

        record[key] = this.convertDateStrings(operatorRecord, template);
      }
    }

    return obj;
  }

  private normalizeDateFilterValue(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    if (/^\d+$/.test(trimmedValue)) {
      const timestamp = Number(trimmedValue);
      if (!Number.isFinite(timestamp)) {
        return null;
      }

      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ||
      !Number.isNaN(Date.parse(trimmedValue))
    ) {
      const date = new Date(trimmedValue);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  private normalizeDatePayloadValue(value: unknown): Date | null | undefined {
    if (value === null) {
      return null;
    }

    if (typeof value === 'string' && !value.trim()) {
      return null;
    }

    const normalizedValue = this.normalizeDateFilterValue(value);
    if (normalizedValue) {
      return normalizedValue;
    }

    return undefined;
  }
}
