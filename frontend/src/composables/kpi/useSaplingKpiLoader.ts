import { computed, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { KPIItem } from '@/entity/entity';

export interface SaplingKpiLoadable {
  loadKpiValue: () => Promise<void>;
}

interface UseSaplingKpiLoaderOptions {
  load: (kpi: KPIItem) => Promise<void>;
  reset: () => void;
}

/**
 * Centralizes the common KPI loading lifecycle shared by all KPI widgets.
 */
export function useSaplingKpiLoader(
  kpi: MaybeRefOrGetter<KPIItem | null | undefined>,
  options: UseSaplingKpiLoaderOptions,
) {
  //#region State
  const loading = ref(false);
  const kpiHandle = computed(() => toValue(kpi)?.handle ?? null);
  //#endregion

  //#region Methods
  /**
   * Loads the KPI payload for the currently bound KPI definition.
   */
  async function loadKpiValue() {
    const currentKpi = toValue(kpi);

    if (!currentKpi?.handle) {
      options.reset();
      return;
    }

    loading.value = true;

    try {
      await options.load(currentKpi);
    } catch {
      options.reset();
    } finally {
      loading.value = false;
    }
  }
  //#endregion

  //#region Lifecycle
  onMounted(() => {
    void loadKpiValue();
  });

  watch(kpiHandle, (newHandle, oldHandle) => {
    if (!newHandle) {
      options.reset();
      return;
    }

    if (newHandle !== oldHandle) {
      void loadKpiValue();
    }
  });
  //#endregion

  //#region Return
  return {
    loading,
    loadKpiValue,
  };
  //#endregion
}