import ApiKpiService from '@/services/api.kpi.service'
import type { KPIItem } from '@/entity/entity'
import { computed, ref, type MaybeRefOrGetter } from 'vue'
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader'
import { normalizeKpiDisplayValue } from '@/utils/saplingKpiValue'

/**
 * Loads and exposes the numeric value for an item KPI.
 */
export function useSaplingKpiItem(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const value = ref<number | string | null>(null)
  const hasData = computed(() => value.value !== null && value.value !== '')
  //#endregion

  //#region Methods
  function resetValue() {
    value.value = null
  }

  const { loading, hasError, isLoaded, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiKpiService.execute<number | string | null>(currentKpi.handle)

      if (typeof result?.value === 'undefined' || result?.value === null) {
        value.value = null
        return
      }

      value.value = normalizeKpiDisplayValue(result.value)
    },
    reset: resetValue,
  })
  //#endregion

  //#region Return
  return { value, loading, hasError, isLoaded, hasData, loadKpiValue }
  //#endregion
}
