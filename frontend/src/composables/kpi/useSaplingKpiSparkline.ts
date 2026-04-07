import ApiService from '@/services/api.service';
import type { KPIItem } from '@/entity/entity';
import type { KpiSparklineData, KpiSparklineValue } from '@/entity/structure';
import { computed, ref, type MaybeRefOrGetter } from 'vue';
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader';
import { normalizeKpiNumericValue } from '@/utils/saplingKpiValue';

function isSparklineDataPoint(value: unknown): value is KpiSparklineValue {
  return value !== null
    && typeof value === 'object'
    && 'value' in value;
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
  //#endregion

  //#region Methods
  function resetData() {
    data.value = [];
  }

  const { loading, hasError, isLoaded, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiService.findAll<KpiSparklineData>(`kpi/execute/${currentKpi.handle}`);
      data.value = Array.isArray(result?.value)
        ? result.value.filter(isSparklineDataPoint)
        : [];
    },
    reset: resetData,
  });

  const value = computed(() => data.value.map((dataPoint) => normalizeKpiNumericValue(dataPoint.value)));
  const hasData = computed(() => value.value.length > 0);
  const firstValue = computed(() => (value.value.length > 0 ? value.value[0] : null));
  const lastValue = computed(() => (value.value.length > 0 ? value.value[value.value.length - 1] : null));
  const firstLabel = computed(() => formatSparklineLabel(data.value[0]));
  const lastLabel = computed(() => formatSparklineLabel(data.value[data.value.length - 1]));
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
    loading,
    hasError,
    isLoaded,
    hasData,
    loadKpiValue,
  };
  //#endregion
}
