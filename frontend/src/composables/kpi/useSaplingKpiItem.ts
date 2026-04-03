import ApiService from '@/services/api.service';
import type { KPIItem } from '@/entity/entity';
import type { KpiItemData } from '@/entity/structure';
import { ref, type MaybeRefOrGetter } from 'vue';
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader';
import { normalizeKpiDisplayValue } from '@/utils/saplingKpiValue';

/**
 * Loads and exposes the numeric value for an item KPI.
 */
export function useSaplingKpiItem(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const value = ref<number | string>(0);
  //#endregion

  //#region Methods
  function resetValue() {
    value.value = 0;
  }

  const { loading, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiService.findAll<KpiItemData>(`kpi/execute/${currentKpi.handle}`);
      value.value = normalizeKpiDisplayValue(result?.value);
    },
    reset: resetValue,
  });
  //#endregion
  
  //#region Return
  return { value, loading, loadKpiValue };
  //#endregion
}
