import type { KPIItem } from '@/entity/entity';

type KpiRow = Record<string, unknown>;
type KpiFilter = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getKpiTargetEntityHandle(
  targetEntity: KPIItem['targetEntity'],
): string | null {
  if (typeof targetEntity === 'string' && targetEntity.length > 0) {
    return targetEntity;
  }

  if (
    isRecord(targetEntity)
    && typeof targetEntity.handle === 'string'
    && targetEntity.handle.length > 0
  ) {
    return targetEntity.handle;
  }

  return null;
}

function buildKpiRowFilter(kpi: KPIItem, row: KpiRow): KpiFilter {
  const rowFilter: KpiFilter = {};

  for (const groupField of kpi.groupBy ?? []) {
    const rowKey = groupField.includes('.')
      ? groupField.split('.').at(-1) ?? groupField
      : groupField;
    const value = row[rowKey];

    if (value === null || typeof value === 'undefined') {
      continue;
    }

    rowFilter[groupField] = value;
  }

  return rowFilter;
}

export function buildKpiEntityFilter(
  kpi: KPIItem | null,
  row?: KpiRow,
): KpiFilter {
  const baseFilter = isRecord(kpi?.filter) ? { ...kpi.filter } : {};

  if (!kpi || !row) {
    return baseFilter;
  }

  const rowFilter = buildKpiRowFilter(kpi, row);

  if (Object.keys(baseFilter).length === 0) {
    return rowFilter;
  }

  if (Object.keys(rowFilter).length === 0) {
    return baseFilter;
  }

  return {
    $and: [baseFilter, rowFilter],
  };
}

export function navigateToKpiEntity(kpi: KPIItem | null, row?: KpiRow) {
  if (typeof window === 'undefined') {
    return;
  }

  const entityHandle = getKpiTargetEntityHandle(kpi?.targetEntity ?? null);
  if (!entityHandle) {
    return;
  }

  const filter = buildKpiEntityFilter(kpi, row);
  const query = Object.keys(filter).length > 0
    ? `?filter=${encodeURIComponent(JSON.stringify(filter))}`
    : '';

  window.location.href = `/table/${entityHandle}${query}`;
}