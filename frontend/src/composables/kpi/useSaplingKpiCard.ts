import type { SaplingKpiCardProps } from '@/components/kpi/SaplingKpiCard.vue';
import { ref } from 'vue';

export function useKpiCard(props: SaplingKpiCardProps) {
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
      if (props.kpi?.targetEntity) {
        if(props.kpi.filter) {
          window.location.href = `/table/${props.kpi.targetEntity}?filter=${encodeURIComponent(JSON.stringify(props.kpi.filter))}`;
        }
        else {
          window.location.href = `/table/${props.kpi.targetEntity}`;
        }
      }
  }

  return {
    setRef,
    refreshKpi,
    openEntity,
    openKpiDeleteDialog,
  };
}
