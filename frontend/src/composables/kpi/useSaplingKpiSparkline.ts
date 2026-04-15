import ApiService from '@/services/api.service';
import type { KPIItem } from '@/entity/entity';
import type {
  KpiDrilldown,
  KpiDrilldownEntry,
  KpiResponse,
  KpiSparklineValue,
} from '@/entity/structure';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader';
import { normalizeKpiNumericValue } from '@/utils/saplingKpiValue';
import { navigateToKpiDrilldown } from '@/utils/saplingKpiNavigation';
import { useRouter } from 'vue-router';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSparklineDataPoint(value: unknown): value is KpiSparklineValue {
  return value !== null
    && typeof value === 'object'
    && 'value' in value;
}

function isKpiDrilldownEntry(value: unknown): value is KpiDrilldownEntry {
  return isRecord(value)
    && typeof value.key === 'string'
    && typeof value.label === 'string'
    && isRecord(value.filter);
}

function isKpiDrilldown(value: unknown): value is KpiDrilldown {
  return isRecord(value)
    && typeof value.entityHandle === 'string'
    && isRecord(value.baseFilter);
}

function formatSparklineLabel(dataPoint: KpiSparklineValue | undefined): string | null {
  if (!dataPoint) {
    return null;
  }

  if (
    typeof dataPoint.day === 'number'
    && typeof dataPoint.month === 'number'
    && typeof dataPoint.year === 'number'
  ) {
    return `${dataPoint.day}.${dataPoint.month}/${dataPoint.year}`;
  }

  if (typeof dataPoint.month === 'number' && typeof dataPoint.year === 'number') {
    return `${dataPoint.month}/${dataPoint.year}`;
  }

  return null;
}

/**
 * Loads the sparkline payload and exposes the derived chart metadata for rendering.
 */
export function useSaplingKpiSparkline(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const router = useRouter();
  const gradients = [['#1feaea', '#ffd200', '#f72047']];
  const width = 3;
  const radius = 10;
  const padding = 8;
  const lineCap: 'round' | 'butt' | 'square' = 'round';
  const gradient = gradients[0];
  const gradientDirection: 'top' | 'bottom' | 'left' | 'right' = 'top';
  const fill = false;
  const type: 'trend' | 'bar' = 'trend';
  const autoLineWidth = false;
  const data = ref<KpiSparklineValue[]>([]);
  const drilldown = ref<KpiDrilldown | null>(null);
  //#endregion

  //#region Methods
  function resetData() {
    data.value = [];
    drilldown.value = null;
  }

  const { loading, hasError, isLoaded, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiService.findAll<KpiResponse<KpiSparklineValue[]>>(`kpi/execute/${currentKpi.handle}`);
      data.value = Array.isArray(result?.value)
        ? result.value.filter(isSparklineDataPoint)
        : [];
      drilldown.value = isKpiDrilldown(result?.drilldown) ? result.drilldown : null;
    },
    reset: resetData,
  });

  const value = computed(() => data.value.map((dataPoint) => normalizeKpiNumericValue(dataPoint.value)));
  const hasData = computed(() => value.value.length > 0);
  const firstValue = computed(() => (value.value.length > 0 ? value.value[0] : null));
  const lastValue = computed(() => (value.value.length > 0 ? value.value[value.value.length - 1] : null));
  const firstLabel = computed(() => formatSparklineLabel(data.value[0]));
  const lastLabel = computed(() => formatSparklineLabel(data.value[data.value.length - 1]));
  const drilldownItems = computed(() => {
    const items = Array.isArray(drilldown.value?.items)
      ? drilldown.value.items.filter(isKpiDrilldownEntry)
      : [];

    return items.map((entry, index) => ({
      entry,
      index,
      label: formatSparklineLabel(data.value[index]) ?? entry.label,
      value: value.value[index] ?? normalizeKpiNumericValue(entry.value),
    }));
  });
  const visibleDrilldownItems = computed(() => drilldownItems.value.slice(-6));

  function openDrilldown(index: number) {
    const entry = drilldownItems.value[index]?.entry;

    if (!entry) {
      return;
    }

    navigateToKpiDrilldown(toValue(kpi) ?? null, drilldown.value, entry, (path) => {
      void router.push(path);
    });
  }
  //#endregion

  //#region Return
  return {
    gradients,
    width,
    radius,
    padding,
    lineCap,
    gradient,
    gradientDirection,
    fill,
    type,
    autoLineWidth,
    value,
    firstValue,
    lastValue,
    firstLabel,
    lastLabel,
    drilldownItems,
    visibleDrilldownItems,
    loading,
    hasError,
    isLoaded,
    hasData,
    openDrilldown,
    loadKpiValue,
  };
  //#endregion
}
