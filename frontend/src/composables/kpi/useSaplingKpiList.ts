
import type { KPIItem } from '@/entity/entity';
import { getKpiTargetEntityHandle, navigateToKpiEntity } from '@/utils/saplingKpiNavigation';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiListData } from '@/entity/structure';
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader';

function isKpiListRow(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Loads and exposes table rows for list KPIs including entity navigation helpers.
 */
export function useSaplingKpiList(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const rows = ref<Array<Record<string, unknown>>>([]);
  const columns = ref<string[]>([]);
  const canOpenEntity = computed(() => Boolean(getKpiTargetEntityHandle(toValue(kpi)?.targetEntity)));
  //#endregion

  //#region Methods
  function resetRows() {
      rows.value = [];
      columns.value = [];
  }

  const { loading, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiService.findAll<KpiListData>(`kpi/execute/${currentKpi.handle}`);
      const nextRows = Array.isArray(result?.value)
        ? result.value.filter(isKpiListRow)
        : [];

      rows.value = nextRows;
      columns.value = nextRows.length > 0 ? Object.keys(nextRows[0]) : [];
    },
    reset: resetRows,
  });

  function openEntity(row: Record<string, unknown>) {
    navigateToKpiEntity(toValue(kpi) ?? null, row);
  }
  //#endregion

  //#region Return
  return { rows, columns, loading, canOpenEntity, openEntity, loadKpiValue };
  //#endregion
}
