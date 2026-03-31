import type { SaplingKpiCardProps } from '@/components/kpi/SaplingKpiCard.vue';
import { navigateToKpiEntity } from '@/utils/saplingKpiNavigation';
import { ref } from 'vue';

export function useSaplingKpiCard(props: SaplingKpiCardProps) {
  const kpiRef = ref<any>(null);

  function setRef(el: any) {
    kpiRef.value = el;
  }

  function refreshKpi() {
    if (kpiRef.value && typeof kpiRef.value.loadKpiValue === 'function') {
      kpiRef.value.loadKpiValue();
    }
    if (props.onRefresh) props.onRefresh(props.kpiIdx);
  }

  function openKpiDeleteDialog() {
    if (props.onDelete) props.onDelete(props.kpiIdx);
  }

  function openEntity() {
    navigateToKpiEntity(props.kpi);
  }

  return {
    setRef,
    refreshKpi,
    openEntity,
    openKpiDeleteDialog,
  };
}
