import { Injectable } from '@nestjs/common';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { PersonItem } from '../../entity/PersonItem';
import { CurrentService } from '../current/current.service';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import {
  TimelineEntitySummaryDto,
  TimelineMonthDto,
  TimelineRecordAnchorDto,
  TimelineSummaryGroupDto,
  TimelineSummaryGroupItemDto,
} from './dto/timeline-response.dto';

export type TimelineRelationDescriptor = {
  entityHandle: string;
  template: EntityTemplateDto[];
  relationFields: EntityTemplateDto[];
  relationCategory: string | null;
  dateFields: TimelineDateFieldConfig;
  chipFields: EntityTemplateDto[];
  booleanFields: EntityTemplateDto[];
  moneyField: EntityTemplateDto | null;
};

export type TimelineDescriptorDataset = {
  descriptor: TimelineRelationDescriptor;
  relationFilter: object;
  records: Record<string, unknown>[];
};

export type TimelineDateFieldConfig = {
  startFieldName: string;
  endFieldName: string;
  startFallbackFieldName: 'createdAt';
  endFallbackFieldName: 'updatedAt';
};

type TimelineDateSpan = {
  start: Date | null;
  end: Date | null;
};

export type TimelineMonthWindow = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type TimelineGroupIdentity = {
  key: string;
  label: string;
  color?: string | null;
  icon?: string | null;
  rawValue: string | number | boolean | null;
};

export type TimelineRecordResult = Record<string, unknown> & {
  updatedAt?: Date;
  createdAt?: Date;
};

@Injectable()
export class GenericTimelineService {
  constructor(
    private readonly templateService: TemplateService,
    private readonly currentService: CurrentService,
  ) {}

  buildTimelineAnchor(
    entityHandle: string,
    handle: string | number,
    record: Record<string, unknown>,
    template: EntityTemplateDto[],
    dateFields: TimelineDateFieldConfig,
  ): TimelineRecordAnchorDto {
    const anchor = new TimelineRecordAnchorDto();
    const span = this.getTimelineDateSpan(record, dateFields);
    anchor.entityHandle = entityHandle;
    anchor.handle = handle;
    anchor.label = this.buildTimelineRecordLabel(
      record,
      template,
      entityHandle,
    );
    anchor.startField = dateFields.startFieldName;
    anchor.endField = dateFields.endFieldName;
    anchor.startAt = span.start ? span.start.toISOString() : null;
    anchor.endAt = span.end ? span.end.toISOString() : null;
    anchor.record = record;
    return anchor;
  }

  getTimelineRelationDescriptors(
    mainEntityHandle: string,
    currentUser: PersonItem,
  ): TimelineRelationDescriptor[] {
    return ENTITY_REGISTRY.flatMap(({ name }) => {
      if (name === mainEntityHandle) {
        return [];
      }

      const permission = this.currentService.getEntityPermissions(
        currentUser,
        name,
      );
      if (!permission.allowRead) {
        return [];
      }

      const template = this.templateService.getEntityTemplate(name);
      const candidateRelationFields = template.filter(
        (field) =>
          field.kind === 'm:1' &&
          field.referenceName === mainEntityHandle &&
          !field.options?.includes('isSecurity') &&
          !field.options?.includes('isSystem') &&
          !field.options?.includes('isHideAsReference'),
      );

      const relationFieldGroups = this.groupTimelineRelationFields(
        candidateRelationFields,
        mainEntityHandle,
      );

      if (relationFieldGroups.length === 0) {
        return [];
      }

      return relationFieldGroups.map((relationFields) => ({
        entityHandle: name,
        template,
        relationFields,
        relationCategory: this.getTimelineRelationCategory(relationFields),
        dateFields: this.getTimelineDateFieldConfig(template),
        chipFields: template.filter(
          (field) =>
            field.options?.includes('isChip') &&
            !field.options?.includes('isSecurity') &&
            !field.options?.includes('isSystem'),
        ),
        booleanFields: template.filter(
          (field) =>
            field.type === 'boolean' &&
            !field.options?.includes('isSecurity') &&
            !field.options?.includes('isSystem'),
        ),
        moneyField:
          template.find(
            (field) =>
              field.options?.includes('isMoney') &&
              !field.options?.includes('isSecurity') &&
              !field.options?.includes('isSystem'),
          ) ?? null,
      }));
    });
  }

  buildTimelineMonth(
    datasets: TimelineDescriptorDataset[],
    monthWindow: TimelineMonthWindow,
  ): TimelineMonthDto {
    const month = new TimelineMonthDto();
    month.key = monthWindow.key;
    month.label = monthWindow.label;
    month.start = monthWindow.start.toISOString();
    month.end = monthWindow.end.toISOString();

    for (const dataset of datasets) {
      const entitySummary = this.buildTimelineEntitySummary(
        dataset,
        monthWindow,
      );

      if (entitySummary) {
        month.entities.push(entitySummary);
      }
    }

    month.entities.sort((left, right) => right.count - left.count);
    return month;
  }

  getTimelineLowerBound(datasets: TimelineDescriptorDataset[]): Date | null {
    let earliestDate: Date | null = null;

    for (const dataset of datasets) {
      for (const record of dataset.records) {
        const span = this.getTimelineDateSpan(
          record,
          dataset.descriptor.dateFields,
        );
        const candidateDate = span.start ?? span.end;

        if (!candidateDate) {
          continue;
        }

        if (!earliestDate || candidateDate.getTime() < earliestDate.getTime()) {
          earliestDate = candidateDate;
        }
      }
    }

    return earliestDate ? this.getMonthStart(earliestDate) : null;
  }

  buildTimelineReverseFilter(
    relationFields: EntityTemplateDto[],
    handle: string | number,
  ): object {
    const clauses = relationFields.map((field) => ({ [field.name]: handle }));

    if (clauses.length === 0) {
      return {};
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    return { $or: clauses };
  }

  buildTimelineRecordUpperBoundFilter(
    dateFields: TimelineDateFieldConfig,
    upperBound: Date,
  ): object {
    return this.buildTimelineBoundaryComparisonFilter(
      dateFields.startFieldName,
      dateFields.startFallbackFieldName,
      '$lte',
      upperBound,
    );
  }

  getTimelineDateFieldConfig(
    template: EntityTemplateDto[],
  ): TimelineDateFieldConfig {
    const startField =
      template.find((field) => field.options?.includes('isDateStart')) ??
      template.find((field) => field.name === 'createdAt') ??
      null;
    const endField =
      template.find((field) => field.options?.includes('isDateEnd')) ??
      template.find((field) => field.name === 'updatedAt') ??
      null;

    return {
      startFieldName: startField?.name ?? 'createdAt',
      endFieldName: endField?.name ?? 'updatedAt',
      startFallbackFieldName: 'createdAt',
      endFallbackFieldName: 'updatedAt',
    };
  }

  createTimelineMonthWindow(baseDate: Date): TimelineMonthWindow {
    const start = this.getMonthStart(baseDate);
    const end = this.getMonthEnd(baseDate);
    const month = `${String(start.getMonth() + 1).padStart(2, '0')}`;
    const year = start.getFullYear();

    return {
      key: `${year}-${month}`,
      label: `${month}/${year}`,
      start,
      end,
    };
  }

  parseTimelineCursor(value?: string): Date | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value.trim())) {
      return null;
    }

    const [year, month] = value.trim().split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return null;
    }

    return new Date(year, month - 1, 1);
  }

  formatTimelineCursor(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }

  getMonthStart(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
  }

  addMonths(value: Date, delta: number): Date {
    return new Date(
      value.getFullYear(),
      value.getMonth() + delta,
      1,
      0,
      0,
      0,
      0,
    );
  }

  combineWhere(base: object, addition: object): object {
    if (!base || Object.keys(base).length === 0) {
      return addition;
    }

    if (!addition || Object.keys(addition).length === 0) {
      return base;
    }

    return { $and: [base, addition] };
  }

  private buildTimelineEntitySummary(
    dataset: TimelineDescriptorDataset,
    monthWindow: TimelineMonthWindow,
  ): TimelineEntitySummaryDto | null {
    const { descriptor, relationFilter, records } = dataset;
    const monthRecords = this.filterTimelineRecordsByMonth(
      records,
      descriptor.dateFields,
      monthWindow,
    );

    if (monthRecords.length === 0) {
      return null;
    }

    const startCount = monthRecords.filter((record) =>
      this.isTimelineBoundaryWithinMonth(
        record,
        descriptor.dateFields,
        'start',
        monthWindow,
      ),
    ).length;
    const endCount = monthRecords.filter((record) =>
      this.isTimelineBoundaryWithinMonth(
        record,
        descriptor.dateFields,
        'end',
        monthWindow,
      ),
    ).length;

    const summary = new TimelineEntitySummaryDto();
    summary.entityHandle = descriptor.entityHandle;
    summary.label = this.humanizeKey(descriptor.entityHandle);
    summary.relationCategory = descriptor.relationCategory;
    summary.relationFields = descriptor.relationFields.map(
      (field) => field.name,
    );
    summary.count = monthRecords.length;
    summary.startCount = startCount;
    summary.endCount = endCount;
    summary.startField = descriptor.dateFields.startFieldName;
    summary.endField = descriptor.dateFields.endFieldName;
    summary.startFilter = this.buildTimelineActivityFilter(
      relationFilter,
      descriptor.dateFields,
      'start',
      monthWindow,
    ) as Record<string, unknown>;
    summary.endFilter = this.buildTimelineActivityFilter(
      relationFilter,
      descriptor.dateFields,
      'end',
      monthWindow,
    ) as Record<string, unknown>;

    summary.groups = [
      ...this.buildTimelineChipGroups(
        descriptor,
        relationFilter,
        monthRecords,
        monthWindow,
      ),
      ...this.buildTimelineBooleanGroups(
        descriptor,
        relationFilter,
        monthRecords,
        monthWindow,
      ),
    ];

    return summary;
  }

  private buildTimelineChipGroups(
    descriptor: TimelineRelationDescriptor,
    relationFilter: object,
    records: Record<string, unknown>[],
    monthWindow: TimelineMonthWindow,
  ): TimelineSummaryGroupDto[] {
    return descriptor.chipFields
      .map((field) => {
        const items = new Map<
          string,
          {
            identity: TimelineGroupIdentity;
            count: number;
            amount: number | null;
          }
        >();

        for (const record of records) {
          const identity = this.getTimelineGroupIdentity(
            field,
            record[field.name],
          );
          if (!identity) {
            continue;
          }

          const entry = items.get(identity.key) ?? {
            identity,
            count: 0,
            amount: descriptor.moneyField ? 0 : null,
          };

          entry.count += 1;

          if (descriptor.moneyField) {
            const amount = this.getNumericValue(
              record[descriptor.moneyField.name],
            );
            if (amount != null && entry.amount != null) {
              entry.amount += amount;
            }
          }

          items.set(identity.key, entry);
        }

        if (items.size === 0) {
          return null;
        }

        const group = new TimelineSummaryGroupDto();
        group.field = field.name;
        group.label = this.humanizeKey(field.name);
        group.items = [...items.values()]
          .sort((left, right) => right.count - left.count)
          .map((entry) =>
            this.createTimelineSummaryGroupItem(
              entry.identity,
              entry.count,
              entry.amount,
              descriptor.moneyField?.name ?? null,
              this.combineWhere(
                this.buildTimelineMonthFilter(
                  relationFilter,
                  descriptor.dateFields,
                  monthWindow,
                ),
                this.buildTimelineGroupFilter(
                  field.name,
                  entry.identity.rawValue,
                ),
              ),
            ),
          );

        return group;
      })
      .filter((group): group is TimelineSummaryGroupDto => group !== null);
  }

  private buildTimelineBooleanGroups(
    descriptor: TimelineRelationDescriptor,
    relationFilter: object,
    records: Record<string, unknown>[],
    monthWindow: TimelineMonthWindow,
  ): TimelineSummaryGroupDto[] {
    if (descriptor.chipFields.length > 0) {
      return [];
    }

    return descriptor.booleanFields
      .map((field) => {
        const truthyCount = records.filter(
          (record) => record[field.name] === true,
        ).length;
        const falsyCount = records.filter(
          (record) => record[field.name] === false,
        ).length;

        if (truthyCount === 0 && falsyCount === 0) {
          return null;
        }

        const group = new TimelineSummaryGroupDto();
        group.field = field.name;
        group.label = this.humanizeKey(field.name);
        group.items = [
          this.createTimelineSummaryGroupItem(
            {
              key: 'true',
              label: 'Ja',
              rawValue: true,
            },
            truthyCount,
            null,
            null,
            this.combineWhere(
              this.buildTimelineMonthFilter(
                relationFilter,
                descriptor.dateFields,
                monthWindow,
              ),
              this.buildTimelineGroupFilter(field.name, true),
            ),
          ),
          this.createTimelineSummaryGroupItem(
            {
              key: 'false',
              label: 'Nein',
              rawValue: false,
            },
            falsyCount,
            null,
            null,
            this.combineWhere(
              this.buildTimelineMonthFilter(
                relationFilter,
                descriptor.dateFields,
                monthWindow,
              ),
              this.buildTimelineGroupFilter(field.name, false),
            ),
          ),
        ].filter((item) => item.count > 0);

        return group.items.length > 0 ? group : null;
      })
      .filter((group): group is TimelineSummaryGroupDto => group !== null);
  }

  private createTimelineSummaryGroupItem(
    identity: TimelineGroupIdentity,
    count: number,
    amount: number | null,
    moneyField: string | null,
    drilldownFilter: object,
  ): TimelineSummaryGroupItemDto {
    const item = new TimelineSummaryGroupItemDto();
    item.key = identity.key;
    item.label = identity.label;
    item.color = identity.color ?? null;
    item.icon = identity.icon ?? null;
    item.count = count;
    item.amount = amount;
    item.moneyField = moneyField;
    item.drilldownFilter = drilldownFilter as Record<string, unknown>;
    return item;
  }

  private groupTimelineRelationFields(
    relationFields: EntityTemplateDto[],
    mainEntityHandle: string,
  ): EntityTemplateDto[][] {
    const prioritizedOption =
      mainEntityHandle === 'person'
        ? 'isPerson'
        : mainEntityHandle === 'company'
          ? 'isCompany'
          : null;

    if (!prioritizedOption) {
      return relationFields.length > 0 ? [relationFields] : [];
    }

    const prioritizedFields = relationFields.filter((field) =>
      field.options?.includes(prioritizedOption),
    );

    if (prioritizedFields.length <= 1) {
      return relationFields.length > 0 ? [relationFields] : [];
    }

    const prioritizedNames = new Set(
      prioritizedFields.map((field) => field.name),
    );
    const remainingFields = relationFields.filter(
      (field) => !prioritizedNames.has(field.name),
    );

    return [
      ...prioritizedFields.map((field) => [field]),
      ...(remainingFields.length > 0 ? [remainingFields] : []),
    ];
  }

  private getTimelineRelationCategory(
    relationFields: EntityTemplateDto[],
  ): string | null {
    return relationFields.length > 1 ? 'reference' : null;
  }

  private buildTimelineMonthFilter(
    relationFilter: object,
    dateFields: TimelineDateFieldConfig,
    monthWindow: TimelineMonthWindow,
  ): object {
    return this.combineWhere(
      relationFilter,
      this.buildTimelineSpanOverlapFilter(dateFields, monthWindow),
    );
  }

  private buildTimelineActivityFilter(
    relationFilter: object,
    dateFields: TimelineDateFieldConfig,
    boundary: 'start' | 'end',
    monthWindow: TimelineMonthWindow,
  ): object {
    const fieldName =
      boundary === 'start'
        ? dateFields.startFieldName
        : dateFields.endFieldName;
    const fallbackFieldName =
      boundary === 'start'
        ? dateFields.startFallbackFieldName
        : dateFields.endFallbackFieldName;

    return this.combineWhere(
      relationFilter,
      this.buildTimelineBoundaryMonthFilter(
        fieldName,
        fallbackFieldName,
        monthWindow,
      ),
    );
  }

  private buildTimelineSpanOverlapFilter(
    dateFields: TimelineDateFieldConfig,
    monthWindow: TimelineMonthWindow,
  ): object {
    return {
      $and: [
        this.buildTimelineBoundaryComparisonFilter(
          dateFields.startFieldName,
          dateFields.startFallbackFieldName,
          '$lte',
          monthWindow.end,
        ),
        this.buildTimelineBoundaryComparisonFilter(
          dateFields.endFieldName,
          dateFields.endFallbackFieldName,
          '$gte',
          monthWindow.start,
        ),
      ],
    };
  }

  private buildTimelineBoundaryComparisonFilter(
    fieldName: string,
    fallbackFieldName: string,
    operator: '$gte' | '$lte',
    value: Date,
  ): object {
    if (fieldName === fallbackFieldName) {
      return { [fieldName]: { [operator]: value } };
    }

    return {
      $or: [
        { [fieldName]: { [operator]: value } },
        {
          $and: [
            { [fieldName]: null },
            { [fallbackFieldName]: { [operator]: value } },
          ],
        },
      ],
    };
  }

  private buildTimelineBoundaryMonthFilter(
    fieldName: string,
    fallbackFieldName: string,
    monthWindow: TimelineMonthWindow,
  ): object {
    if (fieldName === fallbackFieldName) {
      return {
        [fieldName]: {
          $gte: monthWindow.start,
          $lte: monthWindow.end,
        },
      };
    }

    return {
      $or: [
        {
          [fieldName]: {
            $gte: monthWindow.start,
            $lte: monthWindow.end,
          },
        },
        {
          $and: [
            { [fieldName]: null },
            {
              [fallbackFieldName]: {
                $gte: monthWindow.start,
                $lte: monthWindow.end,
              },
            },
          ],
        },
      ],
    };
  }

  private getTimelineDateSpan(
    record: Record<string, unknown>,
    dateFields: TimelineDateFieldConfig,
  ): TimelineDateSpan {
    const primaryStart = this.getRecordDate(record[dateFields.startFieldName]);
    const fallbackStart =
      dateFields.startFieldName !== dateFields.startFallbackFieldName
        ? this.getRecordDate(record[dateFields.startFallbackFieldName])
        : null;
    const primaryEnd = this.getRecordDate(record[dateFields.endFieldName]);
    const fallbackEnd =
      dateFields.endFieldName !== dateFields.endFallbackFieldName
        ? this.getRecordDate(record[dateFields.endFallbackFieldName])
        : null;

    const start = primaryStart ?? fallbackStart ?? primaryEnd ?? fallbackEnd;
    const end = primaryEnd ?? fallbackEnd ?? primaryStart ?? fallbackStart;

    return {
      start: start ?? null,
      end: end ?? null,
    };
  }

  private filterTimelineRecordsByMonth(
    records: Record<string, unknown>[],
    dateFields: TimelineDateFieldConfig,
    monthWindow: TimelineMonthWindow,
  ): Record<string, unknown>[] {
    return records.filter((record) => {
      const span = this.getTimelineDateSpan(record, dateFields);

      if (!span.start && !span.end) {
        return false;
      }

      const start = span.start ?? span.end;
      const end = span.end ?? span.start;

      if (!start || !end) {
        return false;
      }

      return (
        start.getTime() <= monthWindow.end.getTime() &&
        end.getTime() >= monthWindow.start.getTime()
      );
    });
  }

  private buildTimelineGroupFilter(
    fieldName: string,
    rawValue: string | number | boolean | null,
  ): object {
    return { [fieldName]: rawValue };
  }

  private getTimelineGroupIdentity(
    field: EntityTemplateDto,
    value: unknown,
  ): TimelineGroupIdentity | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'object') {
      const referenceValue = value as Record<string, unknown>;
      const rawValue = this.extractHandleValue(referenceValue);
      const label =
        this.buildTimelineRecordLabel(
          referenceValue,
          field.referenceName
            ? this.templateService.getEntityTemplate(field.referenceName)
            : [],
          field.referenceName,
        ) || String(rawValue ?? '-');

      return {
        key: String(rawValue ?? label),
        label,
        color:
          typeof referenceValue.color === 'string'
            ? referenceValue.color
            : null,
        icon:
          typeof referenceValue.icon === 'string' ? referenceValue.icon : null,
        rawValue: rawValue ?? null,
      };
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return {
        key: String(value),
        label: String(value),
        rawValue: value,
      };
    }

    return null;
  }

  private buildTimelineRecordLabel(
    record: Record<string, unknown>,
    template: EntityTemplateDto[],
    fallback?: string,
  ): string {
    const compactParts = template
      .filter((field) => field.options?.includes('isValue'))
      .map((field) => this.getTimelineDisplayValue(field, record[field.name]))
      .filter((value): value is string => value.length > 0);

    if (compactParts.length > 0) {
      return compactParts.join(' ');
    }

    const fallbackFields = ['title', 'name', 'description', 'number', 'handle'];
    for (const fieldName of fallbackFields) {
      const value = record[fieldName];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return fallback ? this.humanizeKey(fallback) : '-';
  }

  private getTimelineDisplayValue(
    field: EntityTemplateDto,
    value: unknown,
  ): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'object' && field.referenceName) {
      return this.buildTimelineRecordLabel(
        value as Record<string, unknown>,
        this.templateService.getEntityTemplate(field.referenceName),
        field.referenceName,
      );
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private getNumericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
  }

  private getMonthEnd(value: Date): Date {
    return new Date(
      value.getFullYear(),
      value.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  private getRecordDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedDate = new Date(value);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  private isTimelineBoundaryWithinMonth(
    record: Record<string, unknown>,
    dateFields: TimelineDateFieldConfig,
    boundary: 'start' | 'end',
    monthWindow: TimelineMonthWindow,
  ): boolean {
    const span = this.getTimelineDateSpan(record, dateFields);
    const parsedDate = boundary === 'start' ? span.start : span.end;
    if (!parsedDate) {
      return false;
    }

    return (
      parsedDate.getTime() >= monthWindow.start.getTime() &&
      parsedDate.getTime() <= monthWindow.end.getTime()
    );
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (character) => character.toUpperCase());
  }

  private extractHandleValue(
    value: unknown,
  ): string | number | null | undefined {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      return value;
    }

    if (typeof value !== 'object') {
      return undefined;
    }

    const objectValue = value as Record<string, unknown>;

    if (
      'unwrap' in value &&
      typeof (value as { unwrap?: unknown }).unwrap === 'function'
    ) {
      return this.extractHandleValue(
        (value as { unwrap: () => unknown }).unwrap(),
      );
    }

    if (
      'getEntity' in value &&
      typeof (value as { getEntity?: unknown }).getEntity === 'function'
    ) {
      return this.extractHandleValue(
        (value as { getEntity: () => unknown }).getEntity(),
      );
    }

    if ('handle' in objectValue) {
      const nestedHandle = objectValue.handle;

      if (
        nestedHandle == null ||
        typeof nestedHandle === 'string' ||
        typeof nestedHandle === 'number'
      ) {
        return nestedHandle;
      }
    }

    return undefined;
  }
}
