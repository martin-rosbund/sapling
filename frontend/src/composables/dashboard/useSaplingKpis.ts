import { ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { KPIItem, DashboardItem } from '../../entity/entity';

/**
 * Encapsulates KPI assignment state and actions for a single dashboard instance.
 */
export function useSaplingKpis(dashboard: DashboardItem) {
  // #region State
  const kpiDeleteDialog = ref(false);
  const kpiToDelete = ref<KPIItem | null>(null);
  const addKpiDialog = ref(false);
  const selectedKpi = ref<KPIItem | null>(null);
  const availableKpis = ref<KPIItem[]>([]);
  // #endregion

  // #region Methods
  /**
   * Closes the add-KPI dialog and clears the current selection.
   */
  function closeAddKpiDialog() {
    addKpiDialog.value = false;
    selectedKpi.value = null;
  }

  /**
   * Persists the selected KPI after the dialog has already validated the form.
   */
  async function validateAndAddKpi() {
    await addKpiToDashboard();
  }

  /**
   * Opens the KPI delete dialog for the KPI belonging to the current dashboard.
   */
  function openKpiDeleteDialog(kpiHandle: number) {
    kpiToDelete.value = dashboard.kpis?.find((kpi) => kpi.handle === kpiHandle) || null;
    kpiDeleteDialog.value = true;
  }

  /**
   * Deletes the currently selected KPI reference from the dashboard.
   */
  async function confirmKpiDelete() {
    if (
      dashboard.handle != null &&
      kpiToDelete.value &&
      kpiToDelete.value.handle != null
    ) {
      await ApiGenericService.deleteReference<DashboardItem>('dashboard', 'kpis', dashboard.handle, kpiToDelete.value.handle);

      if (dashboard.kpis) {
        const idx = dashboard.kpis.findIndex((kpi) => kpi.handle === kpiToDelete.value?.handle);
        if (idx !== -1) {
          dashboard.kpis.splice(idx, 1);
        }
      }
    }

    cancelKpiDelete();
  }

  /**
   * Closes the KPI delete dialog and clears the current selection.
   */
  function cancelKpiDelete() {
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
  }

  /**
   * Loads all available KPIs that are not already assigned to the current dashboard.
   */
  async function openAddKpiDialog() {
    if (dashboard.handle == null) {
      return;
    }

    selectedKpi.value = null;
    const res = await ApiGenericService.find<KPIItem>('kpi');

    const assignedKpiHandles = new Set((dashboard.kpis || []).map((kpi) => kpi.handle));
    availableKpis.value = (res.data || []).filter((kpi) => !assignedKpiHandles.has(kpi.handle));
    addKpiDialog.value = true;
  }

  /**
   * Persists a KPI reference on the current dashboard and updates the local dashboard list in place.
   */
  async function addKpiToDashboard() {
    if (
      dashboard.handle != null &&
      selectedKpi.value &&
      selectedKpi.value.handle != null
    ) {
      const createdKpi = await ApiGenericService.createReference<KPIItem>(
        'kpi',
        'dashboards',
        selectedKpi.value.handle,
        dashboard.handle,
      );

      if (!Array.isArray(dashboard.kpis)) {
        dashboard.kpis = [];
      }

      if (!dashboard.kpis.some((kpi) => kpi.handle === createdKpi.handle)) {
        dashboard.kpis.push(createdKpi);
      }

      closeAddKpiDialog();
    }
  }
  // #endregion

  // #region Return
  return {
    kpiDeleteDialog,
    kpiToDelete,
    addKpiDialog,
    selectedKpi,
    availableKpis,
    validateAndAddKpi,
    closeAddKpiDialog,
    openKpiDeleteDialog,
    confirmKpiDelete,
    cancelKpiDelete,
    openAddKpiDialog,
  };
  // #endregion
}
