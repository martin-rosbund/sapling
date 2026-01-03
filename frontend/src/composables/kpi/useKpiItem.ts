import { onMounted, ref, watch } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiItemData } from '@/entity/structure';

export function useKpiItem(kpi: any) {
  const value = ref(0);
  const loading = ref(false);

  async function loadKpiValue() {
    if (!kpi?.handle) return;
    loading.value = true;
    try {
      const result = await ApiService.findAll<KpiItemData>(`kpi/execute/${kpi.handle}`);
      // Hier kann Formatierung oder weitere Logik ergänzt werden
      value.value = result?.value ?? 0;
    } catch {
      value.value = 0;
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
  
  return { value, loading, loadKpiValue };
}
