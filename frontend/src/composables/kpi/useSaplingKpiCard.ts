import { ref } from 'vue';

export function useKpiCard(props: any) {
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

  return {
    setRef,
    refreshKpi,
    openKpiDeleteDialog,
  };
}
