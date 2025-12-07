import { ref } from 'vue';

export function useSaplingKpiAddDialog() {
  const kpiFormRef = ref();
  return { kpiFormRef };
}
