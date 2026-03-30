import type { EntityItem, SaplingGenericItem } from "@/entity/entity";
import type { AccumulatedPermission, ColumnFilterItem, ColumnFilterOperator, DialogState, EntityState, EntityTemplate, SaplingTableHeaderItem, SortItem } from "@/entity/structure";
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
    .map(([key, value]) => [key, normalizeColumnFilter(value)] as const)
    .filter(([, value]) => value.value.length > 0)
    .forEach(([key, value]) => {
      const matchingTemplate = filterableTemplates.find((template) => (template.key ?? template.name) === key);
      if (!matchingTemplate) {
        return;
      }

      clauses.push(buildColumnFilterClause(matchingTemplate, value));
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

function normalizeColumnFilter(value: string | ColumnFilterItem): ColumnFilterItem {
  if (typeof value === 'string') {
    return {
      operator: 'like',
      value: value.trim(),
    };
  }

  return {
    operator: value.operator,
    value: value.value.trim(),
  };
}

function buildColumnFilterClause(
  template: EntityTemplate,
  filter: ColumnFilterItem,
): FilterQuery {
  const normalizedValue = normalizeFilterValue(template, filter.value);

  if (filter.operator === 'like') {
    return {
      [template.name]: { $like: `%${String(normalizedValue)}%` },
    };
  }

  if (filter.operator === 'startsWith') {
    return {
      [template.name]: { $like: `${String(normalizedValue)}%` },
    };
  }

  if (filter.operator === 'endsWith') {
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
    [template.name]: { [operatorMap[filter.operator]]: normalizedValue },
  };
}

function normalizeFilterValue(template: EntityTemplate, rawValue: string): string | number | boolean {
  if (['number', 'integer', 'float', 'double', 'decimal'].includes(template.type)) {
    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? rawValue : numericValue;
  }

  if (template.type === 'boolean') {
    if (rawValue.toLowerCase() === 'true') return true;
    if (rawValue.toLowerCase() === 'false') return false;
  }

  return rawValue;
}

  export function getCompactLabel(item?: SaplingGenericItem | null, entityTemplates?: EntityTemplate[]): string {
    if (!item || !entityTemplates) return '';
    return entityTemplates
      .filter(x => x.options?.includes('isShowInCompact'))
      .map(x => formatValue(String(item[x.name] ?? ''), x.type))
      .join(' ');
  }