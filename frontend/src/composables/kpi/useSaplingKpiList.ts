
import type { KPIItem } from '@/entity/entity';
import { getKpiTargetEntityHandle, navigateToKpiEntity } from '@/utils/saplingKpiNavigation';
import { computed, onMounted, ref, watch } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiListData } from '@/entity/structure';

export function useSaplingKpiList(kpi: KPIItem) {
  const rows = ref<Array<Record<string, unknown>>>([]);
  const columns = ref<string[]>([]);
  const loading = ref(false);
  const canOpenEntity = computed(() => Boolean(getKpiTargetEntityHandle(kpi?.targetEntity)));

  async function loadKpiValue() {
    if (!kpi?.handle) return;
    loading.value = true;
    try {
      const result = await ApiService.findAll<KpiListData>(`kpi/execute/${kpi.handle}`);
      const val = result?.value ?? [];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        rows.value = val;
        columns.value = Object.keys(val[0]);
      } else {
        rows.value = [];
        columns.value = [];
      }
    } catch {
      rows.value = [];
      columns.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    loadKpiValue();
  });

  watch(() => kpi?.handle, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) loadKpiValue();
  });

  function openEntity(row: Record<string, unknown>) {
    navigateToKpiEntity(kpi, row);
  }

  return { rows, columns, loading, canOpenEntity, openEntity, loadKpiValue };
}
