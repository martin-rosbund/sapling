import type { KPIItem } from '@/entity/entity';
import type { KpiDrilldown, KpiDrilldownEntry } from '@/entity/structure';

type KpiRow = Record<string, unknown>;
type KpiFilter = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildKpiBaseFilter(filter: unknown): KpiFilter {
  if (isRecord(filter)) {
    return { ...filter };
  }

  if (typeof filter !== 'string' || filter.length === 0) {
    return {};
  }

  try {
    const parsedFilter = JSON.parse(filter) as unknown;

    return isRecord(parsedFilter) ? parsedFilter : {};
  } catch {
    return {};
  }
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
    const pathSegments = groupField.split('.');
    const rowKey = groupField.includes('.')
      ? pathSegments[pathSegments.length - 1] ?? groupField
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
  const baseFilter = buildKpiBaseFilter(kpi?.filter);

  if (!kpi) {
    return baseFilter;
  }

  if (!row) {
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

export function buildKpiEntityPath(kpi: KPIItem | null, row?: KpiRow): string | null {
  const entityHandle = getKpiTargetEntityHandle(kpi?.targetEntity ?? null);
  if (!entityHandle) {
    return null;
  }

  const filter = buildKpiEntityFilter(kpi, row);
  const query = Object.keys(filter).length > 0
    ? `?filter=${encodeURIComponent(JSON.stringify(filter))}`
    : '';

  return `/table/${entityHandle}${query}`;
}

export function buildKpiDrilldownPath(
  kpi: KPIItem | null,
  drilldown?: KpiDrilldown | null,
  entry?: KpiDrilldownEntry | null,
): string | null {
  const entityHandle = drilldown?.entityHandle || getKpiTargetEntityHandle(kpi?.targetEntity ?? null);

  if (!entityHandle) {
    return null;
  }

  const filter = entry?.filter
    ?? (drilldown?.baseFilter && Object.keys(drilldown.baseFilter).length > 0
      ? drilldown.baseFilter
      : buildKpiEntityFilter(kpi));
  const query = Object.keys(filter).length > 0
    ? `?filter=${encodeURIComponent(JSON.stringify(filter))}`
    : '';

  return `/table/${entityHandle}${query}`;
}

export function navigateToKpiEntity(
  kpi: KPIItem | null,
  row?: KpiRow,
  navigate?: (path: string) => void,
) {
  const path = buildKpiEntityPath(kpi, row);

  if (!path) {
    return;
  }

  if (navigate) {
    navigate(path);
    return;
  }

  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}

export function navigateToKpiDrilldown(
  kpi: KPIItem | null,
  drilldown?: KpiDrilldown | null,
  entry?: KpiDrilldownEntry | null,
  navigate?: (path: string) => void,
) {
  const path = buildKpiDrilldownPath(kpi, drilldown, entry);

  if (!path) {
    return;
  }

  if (navigate) {
    navigate(path);
    return;
  }

  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}