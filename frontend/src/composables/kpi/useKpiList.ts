
import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiListData } from '@/entity/structure';

export function useKpiList(kpi: any) {
  const rows = ref<Array<Record<string, unknown>>>([]);
  const columns = ref<string[]>([]);
  const loading = ref(false);

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

  return { rows, columns, loading, loadKpiValue };
}
