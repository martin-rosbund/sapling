import { computed, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { KPIItem } from '@/entity/entity'

export interface SaplingKpiLoadable {
  loadKpiValue: () => Promise<void>
}

interface UseSaplingKpiLoaderOptions {
  load: (kpi: KPIItem) => Promise<void>
  reset: () => void
}

/**
 * Centralizes the common KPI loading lifecycle shared by all KPI widgets.
 */
export function useSaplingKpiLoader(
  kpi: MaybeRefOrGetter<KPIItem | null | undefined>,
  options: UseSaplingKpiLoaderOptions,
) {
  //#region State
  const loading = ref(false)
  const hasError = ref(false)
  const isLoaded = ref(false)
  const kpiHandle = computed(() => toValue(kpi)?.handle ?? null)
  //#endregion

  //#region Methods
  function resetState() {
    options.reset()
    hasError.value = false
    isLoaded.value = false
  }

  /**
   * Loads the KPI payload for the currently bound KPI definition.
   */
  async function loadKpiValue() {
    const currentKpi = toValue(kpi)

    if (!currentKpi?.handle) {
      resetState()
      return
    }

    loading.value = true
    hasError.value = false

    try {
      await options.load(currentKpi)
    } catch {
      options.reset()
      hasError.value = true
    } finally {
      isLoaded.value = true
      loading.value = false
    }
  }
  //#endregion

  //#region Lifecycle
  onMounted(() => {
    void loadKpiValue()
  })

  watch(kpiHandle, (newHandle, oldHandle) => {
    if (!newHandle) {
      resetState()
      return
    }

    if (newHandle !== oldHandle) {
      isLoaded.value = false
      void loadKpiValue()
    }
  })
  //#endregion

  //#region Return
  return {
    loading,
    hasError,
    isLoaded,
    loadKpiValue,
  }
  //#endregion
}
