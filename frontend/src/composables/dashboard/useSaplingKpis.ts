import { onMounted, ref } from 'vue';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import type { KPIItem, DashboardItem } from '../../entity/entity';

export interface DashboardTab {
  id: number;
  title: string;
  icon?: string;
  kpis: KPIItem[];
}

export function useSaplingKpis(userTabs: DashboardTab[], dashboards: DashboardItem[]) {
  // KPI State
  const kpiFormRef = ref<InstanceType<typeof HTMLFormElement> | null>(null);
  const kpiDeleteDialog = ref(false);
  const kpiToDelete = ref<KPIItem | null>(null);
  const kpiDeleteTabIdx = ref<number | null>(null);
  const kpiDeleteKpiIdx = ref<number | null>(null);
  const addKpiDialog = ref(false);
  const selectedKpi = ref<KPIItem | null>(null);
  const kpiTabIdx = ref<number | null>(null);
  const availableKpis = ref<KPIItem[]>([]);

  // Methods
  async function validateAndAddKpi() {
    const valid = await kpiFormRef.value?.validate();
    if (valid) {
      addKpiToTab();
    }
  }

  function openKpiDeleteDialog(tabIdx: number, kpiIdx: number) {
    kpiDeleteTabIdx.value = tabIdx;
    kpiDeleteKpiIdx.value = kpiIdx;
    kpiToDelete.value = userTabs[tabIdx]?.kpis[kpiIdx] || null;
    kpiDeleteDialog.value = true;
  }

  async function confirmKpiDelete() {
    if (
      kpiDeleteTabIdx.value !== null &&
      kpiDeleteKpiIdx.value !== null &&
      kpiToDelete.value &&
      kpiToDelete.value.handle
    ) {
      await ApiGenericService.delete('kpi', { handle: kpiToDelete.value.handle });
      userTabs[kpiDeleteTabIdx.value]?.kpis.splice(kpiDeleteKpiIdx.value, 1);
    }
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
    kpiDeleteTabIdx.value = null;
    kpiDeleteKpiIdx.value = null;
  }

  function cancelKpiDelete() {
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
    kpiDeleteTabIdx.value = null;
    kpiDeleteKpiIdx.value = null;
  }

  async function openAddKpiDialog(tabIdx: number) {
    kpiTabIdx.value = tabIdx;
    selectedKpi.value = null;
    
    const res = await ApiGenericService.find<KPIItem>('kpi');
    availableKpis.value = res.data || [];
    addKpiDialog.value = true;
  }

  function addKpiToTab() {
    if (
      typeof kpiTabIdx.value === 'number' &&
      selectedKpi.value &&
      Array.isArray(dashboards) &&
      dashboards.length > kpiTabIdx.value &&
      Array.isArray(userTabs) &&
      userTabs.length > kpiTabIdx.value
    ) {
      const dashboardHandle = dashboards[kpiTabIdx.value]?.handle;
      ApiGenericService.create('kpi', {
        ...selectedKpi.value,
        dashboards: dashboardHandle ? [dashboardHandle] : [],
      }).then((createdKpi) => {
        const tab = typeof kpiTabIdx.value === 'number' ? userTabs[kpiTabIdx.value] : undefined;
        if (tab && Array.isArray(tab.kpis)) {
          (tab.kpis as KPIItem[]).push(createdKpi as KPIItem);
        }
        addKpiDialog.value = false;
      });
    }
  }

  return {
    kpiDeleteDialog,
    kpiToDelete,
    addKpiDialog,
    selectedKpi,
    availableKpis,
    validateAndAddKpi,
    openKpiDeleteDialog,
    confirmKpiDelete,
    cancelKpiDelete,
    openAddKpiDialog,
    addKpiToTab,
  };
}
