import { ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { KPIItem, DashboardItem } from '../../entity/entity';

export function useSaplingKpis(dashboards: DashboardItem[]) {
  // #region state
  const kpiFormRef = ref<InstanceType<typeof HTMLFormElement> | null>(null);
  const kpiDeleteDialog = ref(false);
  const kpiToDelete = ref<KPIItem | null>(null);
  const kpiDeleteDashboardHandle = ref<number | null>(null);
  const addKpiDialog = ref(false);
  const selectedKpi = ref<KPIItem | null>(null);
  const addKpiDashboardHandle = ref<number | null>(null);
  const availableKpis = ref<KPIItem[]>([]);
  // #endregion

  // #region methods
  async function validateAndAddKpi() {
    const valid = await kpiFormRef.value?.validate();
    if (valid) {
      addKpiToDashboard();
    }
  }

  function openKpiDeleteDialog(dashboardHandle: number, kpiHandle: number) {
    kpiDeleteDashboardHandle.value = dashboardHandle;
    const dashboard = dashboards.find(d => d.handle === dashboardHandle);
    kpiToDelete.value = dashboard?.kpis?.find(k => k.handle === kpiHandle) || null;
    kpiDeleteDialog.value = true;
  }

  async function confirmKpiDelete() {
    if (
      kpiDeleteDashboardHandle.value !== null &&
      kpiToDelete.value &&
      kpiToDelete.value.handle
    ) {
      await ApiGenericService.deleteReference<DashboardItem>('dashboard', 'kpi', { handle: kpiToDelete.value.handle }, { handle: kpiDeleteDashboardHandle.value });
      const dashboard = dashboards.find(d => d.handle === kpiDeleteDashboardHandle.value);
      if (dashboard && dashboard.kpis) {
        const idx = dashboard.kpis.findIndex(k => k.handle === kpiToDelete.value?.handle);
        if (idx !== -1) dashboard.kpis.splice(idx, 1);
      }
    }
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
    kpiDeleteDashboardHandle.value = null;
  }

  function cancelKpiDelete() {
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
    kpiDeleteDashboardHandle.value = null;
  }

  async function openAddKpiDialog(dashboardHandle: number) {
    addKpiDashboardHandle.value = dashboardHandle;
    selectedKpi.value = null;
    const res = await ApiGenericService.find<KPIItem>('kpi');
    availableKpis.value = res.data || [];
    addKpiDialog.value = true;
  }

  function addKpiToDashboard() {
    if (
      addKpiDashboardHandle.value !== null &&
      selectedKpi.value &&
      selectedKpi.value.handle
    ) {
      ApiGenericService.createReference('kpi', 'dashboards', { handle: selectedKpi.value.handle }, { handle: addKpiDashboardHandle.value }).then((createdKpi) => {
        const dashboard = dashboards.find(d => d.handle === addKpiDashboardHandle.value);
        if (dashboard && Array.isArray(dashboard.kpis)) {
          dashboard.kpis.push(createdKpi as KPIItem);
        }
        addKpiDialog.value = false;
      });
    }
  }
  // #endregion

  // #region expose
  return {
    // state
    kpiFormRef,
    kpiDeleteDialog,
    kpiToDelete,
    addKpiDialog,
    selectedKpi,
    availableKpis,
    // methods
    validateAndAddKpi,
    openKpiDeleteDialog,
    confirmKpiDelete,
    cancelKpiDelete,
    openAddKpiDialog,
    addKpiToDashboard,
  };
  // #endregion
}
