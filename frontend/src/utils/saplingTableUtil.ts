import type { EntityItem, SaplingGenericItem } from "@/entity/entity";
import type { AccumulatedPermission, ColumnFilterItem, ColumnFilterOperator, DialogState, EntityState, EntityTemplate, SaplingOption, SaplingTableHeaderItem, SortItem } from "@/entity/structure";
import type { FilterQuery } from "@/services/api.generic.service";
import { formatValue } from "./saplingFormatUtil";

// Helper functions for generating table headers based on entity templates
export function getRelationTableHeaders(
  relationTableStates: Record<string, EntityState>,
  t: (key: string) => string
) {
    const result: Record<string, SaplingTableHeaderItem[]> = {};
    for (const key in relationTableStates) {
      result[key] = (relationTableStates[key]?.entityTemplates ?? [])
        .filter((x: EntityTemplate) => {
          const template = (relationTableStates[key]?.entityTemplates ?? []).find((t: EntityTemplate) => t.name === x.name);
          return template && !(template.isAutoIncrement) && !(template.options?.includes('isSystem'));
        })
        .map((tpl: EntityTemplate) => ({
          ...tpl,
          key: tpl.name,
          title: t(`${(relationTableStates[key]?.entity?.handle)}.${tpl.name}`),
        }));
    }
    return result;
  }
  
export function getEditDialogHeaders(
  entityTemplates: EntityTemplate[],
  mode: DialogState,
  showReference: boolean,
  permissions: AccumulatedPermission[] = []
){
    return entityTemplates.filter(x =>
      !x.options?.includes('isSystem') &&
      !x.isAutoIncrement &&
      !['1:m', 'm:n', 'n:m', '1:1'].includes(x.kind || '') &&
      (!x.isPrimaryKey || mode === 'create') &&
      (!x.isReference || showReference) && 
      (!x.referenceName || permissions?.find(p => p.entityHandle === x.referenceName)?.allowRead)
    )
}
// Helper function for generating table headers for a single entity
export function getTableHeaders(
  entityTemplates: EntityTemplate[],
  entity: EntityItem | null,
  t: (key: string) => string,
  permissions: AccumulatedPermission[] = []
) {
    const result = entityTemplates
      .filter((x: EntityTemplate) => {
        return !x.options?.includes('isSystem')
          && !(x.isAutoIncrement) 
          && !(x.options?.includes('isSecurity')) 
          && !((x.length ?? 0) > 256)
          && !['1:m', 'm:n', 'n:m', '1:1'].includes(x.kind ?? '');
      })
      .map((tpl: EntityTemplate) => ({
        ...tpl,
        key: tpl.name,
        title: t(`${(entity?.handle)}.${tpl.name}`),
      }));
      
    return result;
  }

export function isFilterableTableColumn(template: Partial<EntityTemplate & { key?: string | null }>): boolean {
  const columnKey = template.key ?? template.name;
  return Boolean(columnKey)
    && !['__select', '__actions'].includes(columnKey ?? '')
    && !template.isReference
    && !template.options?.includes('isSecurity')
    && !template.options?.includes('isSystem')
    && !['1:m', 'm:n', 'n:m', '1:1', 'm:1'].includes(template.kind ?? '')
    && !((template.length ?? 0) > 256)
    && template.type !== 'JsonType';
}

export function isBooleanTemplate(template?: Partial<EntityTemplate>): boolean {
  return normalizeTemplateType(template) === 'boolean';
}

export function isDateTemplate(template?: Partial<EntityTemplate>): boolean {
  return ['date', 'datetype', 'datetime'].includes(normalizeTemplateType(template));
}

export function isTimeTemplate(template?: Partial<EntityTemplate>): boolean {
  return normalizeTemplateType(template) === 'time';
}

export function isNumericTemplate(template?: Partial<EntityTemplate>): boolean {
  return ['number', 'integer', 'float', 'double', 'decimal'].includes(normalizeTemplateType(template));
}

export function isRangeTemplate(template?: Partial<EntityTemplate>): boolean {
  return isDateTemplate(template) || isTimeTemplate(template) || isNumericTemplate(template);
}

export function getDefaultColumnFilterOperatorForTemplate(template?: Partial<EntityTemplate>): ColumnFilterOperator {
  if (isBooleanTemplate(template) || hasTemplateOption(template, 'isColor') || hasTemplateOption(template, 'isIcon')) {
    return 'eq';
  }

  if (isDateTemplate(template) || isTimeTemplate(template) || isNumericTemplate(template)) {
    return 'eq';
  }

  return 'like';
}

export function getAllowedColumnFilterOperators(template?: Partial<EntityTemplate>): ColumnFilterOperator[] {
  if (isBooleanTemplate(template) || hasTemplateOption(template, 'isColor') || hasTemplateOption(template, 'isIcon')) {
    return ['eq'];
  }

  if (isDateTemplate(template) || isTimeTemplate(template) || isNumericTemplate(template)) {
    return ['eq', 'gt', 'gte', 'lt', 'lte'];
  }

  return ['like', 'startsWith', 'endsWith', 'eq'];
}

export function buildTableFilter({
  search,
  columnFilters = {},
  entityTemplates,
  parentFilter,
  urlFilter,
}: {
  search?: string;
  columnFilters?: Record<string, string | ColumnFilterItem>;
  entityTemplates: EntityTemplate[];
  parentFilter?: Record<string, unknown>;
  urlFilter?: unknown;
}): FilterQuery {
  const clauses: FilterQuery[] = [];
  const filterableTemplates = entityTemplates.filter(isFilterableTableColumn);
  const normalizedSearch = search?.trim() ?? '';

  if (normalizedSearch && filterableTemplates.length > 0) {
    clauses.push({
      $or: filterableTemplates.map((template) => ({
        [template.name]: { $like: `%${normalizedSearch}%` },
      })),
    });
  }

  Object.entries(columnFilters)
    .forEach(([key, value]) => {
      const matchingTemplate = filterableTemplates.find((template) => (template.key ?? template.name) === key);
      if (!matchingTemplate) {
        return;
      }

      const normalizedValue = normalizeColumnFilter(matchingTemplate, value);
      if (isEmptyColumnFilter(normalizedValue)) {
        return;
      }

      clauses.push(buildColumnFilterClause(matchingTemplate, normalizedValue));
    });

  if (parentFilter && Object.keys(parentFilter).length > 0) {
    clauses.push(parentFilter);
  }

  if (urlFilter && typeof urlFilter === 'object' && Object.keys(urlFilter as Record<string, unknown>).length > 0) {
    clauses.push(urlFilter as FilterQuery);
  }

  if (clauses.length === 0) {
    return {};
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { $and: clauses };
}

export function buildTableOrderBy(sortBy: SortItem[] = []): Record<string, string> {
  const orderBy: Record<string, string> = {};

  sortBy.forEach((sort) => {
    if (!sort.key || ['__select', '__actions'].includes(sort.key)) {
      return;
    }

    orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
  });

  return orderBy;
}

function normalizeColumnFilter(template: Partial<EntityTemplate> | undefined, value: string | ColumnFilterItem): ColumnFilterItem {
  if (typeof value === 'string') {
    return {
      operator: getDefaultColumnFilterOperatorForTemplate(template),
      value: value.trim(),
    };
  }

  return {
    operator: getNormalizedColumnFilterOperator(template, value.operator),
    value: value.value.trim(),
    rangeStart: value.rangeStart?.trim(),
    rangeEnd: value.rangeEnd?.trim(),
  };
}

function buildColumnFilterClause(
  template: EntityTemplate,
  filter: ColumnFilterItem,
): FilterQuery {
  if (isRangeTemplate(template) && (filter.rangeStart || filter.rangeEnd)) {
    return buildRangeColumnFilterClause(template, filter.rangeStart, filter.rangeEnd);
  }

  const operator = getNormalizedColumnFilterOperator(template, filter.operator);

  if (isDateTemplate(template)) {
    return buildDateColumnFilterClause(template.name, operator, filter.value);
  }

  const normalizedValue = normalizeFilterValue(template, filter.value);

  if (operator === 'like') {
    return {
      [template.name]: { $like: `%${String(normalizedValue)}%` },
    };
  }

  if (operator === 'startsWith') {
    return {
      [template.name]: { $like: `${String(normalizedValue)}%` },
    };
  }

  if (operator === 'endsWith') {
    return {
      [template.name]: { $like: `%${String(normalizedValue)}` },
    };
  }

  const operatorMap: Record<Exclude<ColumnFilterOperator, 'like' | 'startsWith' | 'endsWith'>, string> = {
    eq: '$eq',
    gt: '$gt',
    gte: '$gte',
    lt: '$lt',
    lte: '$lte',
  };

  return {
    [template.name]: { [operatorMap[operator]]: normalizedValue },
  };
}

function normalizeFilterValue(template: EntityTemplate, rawValue: string): string | number | boolean {
  if (isNumericTemplate(template)) {
    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? rawValue : numericValue;
  }

  if (isBooleanTemplate(template)) {
    const normalizedBoolean = rawValue.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalizedBoolean)) return true;
    if (['false', '0', 'no', 'n'].includes(normalizedBoolean)) return false;
  }

  return rawValue;
}

function getNormalizedColumnFilterOperator(
  template: Partial<EntityTemplate> | undefined,
  operator: ColumnFilterOperator,
): ColumnFilterOperator {
  const allowedOperators = getAllowedColumnFilterOperators(template);
  if (allowedOperators.includes(operator)) {
    return operator;
  }

  return getDefaultColumnFilterOperatorForTemplate(template);
}

function isEmptyColumnFilter(filter: ColumnFilterItem): boolean {
  return filter.value.length === 0
    && (filter.rangeStart?.length ?? 0) === 0
    && (filter.rangeEnd?.length ?? 0) === 0;
}

function normalizeTemplateType(template?: Partial<EntityTemplate>): string {
  return String(template?.type ?? '').toLowerCase();
}

function hasTemplateOption(template: Partial<EntityTemplate> | undefined, option: SaplingOption): boolean {
  return Array.isArray(template?.options) && template.options.includes(option);
}

function buildDateColumnFilterClause(
  key: string,
  operator: ColumnFilterOperator,
  rawValue: string,
): FilterQuery {
  const normalizedDate = normalizeDateFilterValue(rawValue);

  if (!normalizedDate) {
    return {
      [key]: { $eq: rawValue },
    };
  }

  if (!normalizedDate.isDateOnly) {
    const operatorMap: Record<'eq' | 'gt' | 'gte' | 'lt' | 'lte', string> = {
      eq: '$eq',
      gt: '$gt',
      gte: '$gte',
      lt: '$lt',
      lte: '$lte',
    };
    const normalizedOperator = ['gt', 'gte', 'lt', 'lte'].includes(operator) ? operator : 'eq';

    return {
      [key]: { [operatorMap[normalizedOperator as 'eq' | 'gt' | 'gte' | 'lt' | 'lte']]: normalizedDate.start },
    };
  }

  switch (operator) {
    case 'gt':
      return { [key]: { $gte: normalizedDate.endExclusive } };
    case 'gte':
      return { [key]: { $gte: normalizedDate.start } };
    case 'lt':
      return { [key]: { $lt: normalizedDate.start } };
    case 'lte':
      return { [key]: { $lt: normalizedDate.endExclusive } };
    case 'eq':
    default:
      return {
        [key]: {
          $gte: normalizedDate.start,
          $lt: normalizedDate.endExclusive,
        },
      };
  }
}

function buildRangeColumnFilterClause(
  template: EntityTemplate,
  rangeStart?: string,
  rangeEnd?: string,
): FilterQuery {
  const normalizedStart = rangeStart?.trim() ?? '';
  const normalizedEnd = rangeEnd?.trim() ?? '';

  if (isDateTemplate(template)) {
    const rangeClauses: FilterQuery[] = [];

    if (normalizedStart) {
      rangeClauses.push(buildDateColumnFilterClause(template.name, 'gte', normalizedStart));
    }

    if (normalizedEnd) {
      rangeClauses.push(buildDateColumnFilterClause(template.name, 'lte', normalizedEnd));
    }

    if (rangeClauses.length === 0) {
      return {};
    }

    if (rangeClauses.length === 1) {
      return rangeClauses[0];
    }

    return { $and: rangeClauses };
  }

  const conditions: Record<string, string | number | boolean> = {};

  if (normalizedStart) {
    conditions.$gte = normalizeFilterValue(template, normalizedStart);
  }

  if (normalizedEnd) {
    conditions.$lte = normalizeFilterValue(template, normalizedEnd);
  }

  return {
    [template.name]: conditions,
  };
}

function normalizeDateFilterValue(rawValue: string): { start: string; endExclusive: string; isDateOnly: boolean } | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const nextDay = new Date(`${value}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);

    return {
      start: value,
      endExclusive: nextDay.toISOString().slice(0, 10),
      isDateOnly: true,
    };
  }

  if (!Number.isNaN(Date.parse(value))) {
    return {
      start: value,
      endExclusive: value,
      isDateOnly: false,
    };
  }

  return null;
}

  export function getCompactLabel(item?: SaplingGenericItem | null, entityTemplates?: EntityTemplate[]): string {
    if (!item || !entityTemplates) return '';
    return entityTemplates
      .filter(x => x.options?.includes('isShowInCompact'))
      .map(x => formatValue(String(item[x.name] ?? ''), x.type))
      .join(' ');
  }