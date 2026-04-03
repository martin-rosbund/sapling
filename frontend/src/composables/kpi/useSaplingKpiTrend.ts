import ApiService from '@/services/api.service';
import type { KPIItem } from '@/entity/entity';
import type { KpiTrendData, KpiTrendValue } from '@/entity/structure';
import { computed, ref, type MaybeRefOrGetter } from 'vue';
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader';
import { normalizeKpiNumericValue } from '@/utils/saplingKpiValue';

function createInitialTrendValue(): KpiTrendValue {
  return {
    current: 0,
    previous: 0,
  };
}

function isKpiTrendValue(value: unknown): value is KpiTrendValue {
  return value !== null
    && typeof value === 'object'
    && 'current' in value
    && 'previous' in value;
}

/**
 * Loads the trend payload and derives the trend presentation metadata for the widget.
 */
export function useSaplingKpiTrend(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const value = ref<KpiTrendValue>(createInitialTrendValue());

  const { loading, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiService.findAll<KpiTrendData>(`kpi/execute/${currentKpi.handle}`);
      value.value = isKpiTrendValue(result?.value)
        ? {
          current: normalizeKpiNumericValue(result.value.current),
          previous: normalizeKpiNumericValue(result.value.previous),
        }
        : createInitialTrendValue();
    },
    reset: () => {
      value.value = createInitialTrendValue();
    },
  });
  //#endregion

  //#region Derived State
  const trendIcon = computed(() => {
    const v = value.value;
    if (v.current > v.previous) return { icon: 'mdi-arrow-up-bold', color: 'green' };
    if (v.current < v.previous) return { icon: 'mdi-arrow-down-bold', color: 'red' };
    return { icon: 'mdi-equal', color: 'grey' };
  });

  const trendText = computed(() => {
    const v = value.value;
    if (v.current > v.previous) return 'up';
    if (v.current < v.previous) return 'down';
    return 'equal';
  });

  const trendValue = computed(() => {
    const v = value.value;
    return v.current - v.previous;
  });
  //#endregion

  //#region Return
  return {
    value,
    loading,
    trendIcon,
    trendText,
    trendValue,
    loadKpiValue,
  };
  //#endregion
}
