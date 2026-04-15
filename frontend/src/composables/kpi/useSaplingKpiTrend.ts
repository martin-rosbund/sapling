import ApiService from '@/services/api.service';
import type { KPIItem } from '@/entity/entity';
import type {
  KpiDrilldown,
  KpiDrilldownEntry,
  KpiResponse,
  KpiTrendValue,
} from '@/entity/structure';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader';
import { normalizeKpiNumericValue } from '@/utils/saplingKpiValue';
import { navigateToKpiDrilldown } from '@/utils/saplingKpiNavigation';
import { useRouter } from 'vue-router';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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

/**
 * Loads the trend payload and derives the trend presentation metadata for the widget.
 */
export function useSaplingKpiTrend(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const router = useRouter();
  const value = ref<KpiTrendValue>(createInitialTrendValue());
  const drilldown = ref<KpiDrilldown | null>(null);
  const hasData = ref(false);

  const { loading, hasError, isLoaded, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiService.findAll<KpiResponse<KpiTrendValue>>(`kpi/execute/${currentKpi.handle}`);
      if (isKpiTrendValue(result?.value)) {
        value.value = {
          current: normalizeKpiNumericValue(result.value.current),
          previous: normalizeKpiNumericValue(result.value.previous),
        };
        drilldown.value = isKpiDrilldown(result.drilldown) ? result.drilldown : null;
        hasData.value = true;
        return;
      }

      value.value = createInitialTrendValue();
      drilldown.value = null;
      hasData.value = false;
    },
    reset: () => {
      value.value = createInitialTrendValue();
      drilldown.value = null;
      hasData.value = false;
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

  const trendPercentage = computed(() => {
    const previousValue = value.value.previous;

    if (previousValue === 0) {
      return null;
    }

    return ((value.value.current - previousValue) / previousValue) * 100;
  });

  const trendDeltaLabel = computed(() => {
    const delta = trendValue.value;
    return `${delta > 0 ? '+' : ''}${delta}`;
  });

  const trendPercentageLabel = computed(() => {
    if (trendPercentage.value === null) {
      return null;
    }

    return `${trendPercentage.value > 0 ? '+' : ''}${trendPercentage.value.toFixed(1)}%`;
  });

  const currentDrilldown = computed(() => isKpiDrilldownEntry(drilldown.value?.current) ? drilldown.value.current : null);
  const previousDrilldown = computed(() => isKpiDrilldownEntry(drilldown.value?.previous) ? drilldown.value.previous : null);
  const canOpenCurrentDrilldown = computed(() => Boolean(currentDrilldown.value));
  const canOpenPreviousDrilldown = computed(() => Boolean(previousDrilldown.value));

  function openCurrentDrilldown() {
    navigateToKpiDrilldown(toValue(kpi) ?? null, drilldown.value, currentDrilldown.value, (path) => {
      void router.push(path);
    });
  }

  function openPreviousDrilldown() {
    navigateToKpiDrilldown(toValue(kpi) ?? null, drilldown.value, previousDrilldown.value, (path) => {
      void router.push(path);
    });
  }
  //#endregion

  //#region Return
  return {
    value,
    loading,
    hasError,
    isLoaded,
    hasData,
    trendIcon,
    trendText,
    trendValue,
    trendDeltaLabel,
    trendPercentageLabel,
    currentDrilldown,
    previousDrilldown,
    canOpenCurrentDrilldown,
    canOpenPreviousDrilldown,
    openCurrentDrilldown,
    openPreviousDrilldown,
    loadKpiValue,
  };
  //#endregion
}
