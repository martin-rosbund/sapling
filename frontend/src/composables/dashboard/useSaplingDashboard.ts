import { computed, onMounted, ref } from 'vue';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import type { DashboardItem, EntityItem } from '../../entity/entity';
import type { EntityTemplate } from '@/entity/structure';

interface DashboardForm {
  name: string;
  [key: string]: unknown;
}

/**
 * Encapsulates dashboard loading, dashboard CRUD state and auxiliary dashboard UI state.
 */
export function useSaplingDashboard() {
  // #region State
  const dashboardDeleteDialog = ref(false);
  const dashboardToDelete = ref<DashboardItem | null>(null);
  const dashboardDialog = ref(false);
  const dashboardEntity = ref<EntityItem | null>(null);
  const dashboardTemplates = ref<EntityTemplate[]>([]);
  const dashboards = ref<DashboardItem[]>([]);
  const activeTab = ref(0);
  const favoritesDrawer = ref(false);
  const currentPersonStore = useCurrentPersonStore();
  const { isLoading, loadTranslations } = useTranslationLoader('global', 'dashboard', 'kpi', 'favorite', 'person');
  const currentDashboard = computed(() => dashboards.value[activeTab.value] ?? null);
  const hasDashboards = computed(() => dashboards.value.length > 0);
  const isDashboardRemovable = computed(() => dashboards.value.length > 1);
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await Promise.all([
      loadTranslations(),
      loadDashboardEntity(),
      loadDashboardTemplates(),
      currentPersonStore.fetchCurrentPerson(),
    ]);

    await loadDashboards();
  });
  // #endregion

  // #region Methods
  /**
   * Loads all dashboards for the current person including their KPI relations.
   */
  async function loadDashboards() {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;

    const dashboardRes = await ApiGenericService.find<DashboardItem>('dashboard', {
      filter: { person: { handle: currentPersonStore.person.handle } },
      relations: ['kpis'],
    });

    dashboards.value = dashboardRes.data || [];
    syncActiveTab();
  }

  /**
   * Loads the dashboard form templates used by the shared edit dialog.
   */
  async function loadDashboardTemplates() {
    dashboardTemplates.value = await ApiService.findAll<EntityTemplate[]>('template/dashboard');
  }

  /**
   * Loads the dashboard entity metadata required by the shared edit dialog.
   */
  async function loadDashboardEntity() {
    dashboardEntity.value = (await ApiGenericService.find<EntityItem>('entity', {
      filter: { handle: 'dashboard' },
      limit: 1,
      page: 1,
    })).data[0] || null;
  }

  /**
   * Keeps the active tab within the currently available dashboard range.
   */
  function syncActiveTab() {
    if (!dashboards.value.length) {
      activeTab.value = 0;
      return;
    }

    activeTab.value = Math.min(Math.max(activeTab.value, 0), dashboards.value.length - 1);
  }

  /**
   * Closes the delete dialog and clears the selected dashboard reference.
   */
  function cancelDashboardDelete() {
    dashboardDeleteDialog.value = false;
    dashboardToDelete.value = null;
  }

  /**
   * Opens the dashboard creation dialog.
   */
  function openDashboardDialog() {
    dashboardDialog.value = true;
  }

  /**
   * Closes the dashboard creation dialog.
   */
  function closeDashboardDialog() {
    dashboardDialog.value = false;
  }

  /**
   * Deletes the selected dashboard and updates the tab selection afterwards.
   */
  async function confirmDashboardDelete() {
    if (!dashboardToDelete.value || dashboardToDelete.value.handle == null) {
      cancelDashboardDelete();
      return;
    }

    await ApiGenericService.delete('dashboard', dashboardToDelete.value.handle);

    const idx = dashboards.value.findIndex((dashboard) => dashboard.handle === dashboardToDelete.value?.handle);
    if (idx !== -1) {
      dashboards.value.splice(idx, 1);
    }

    syncActiveTab();
    cancelDashboardDelete();
  }

  /**
   * Persists a newly created dashboard and switches the active tab to it.
   */
  async function onDashboardSave(form: DashboardForm) {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;

    const dashboard = await ApiGenericService.create<DashboardItem>('dashboard', {
      ...form,
      person: currentPersonStore.person.handle,
    });

    dashboards.value.push({
      ...dashboard,
      kpis: Array.isArray(dashboard.kpis) ? dashboard.kpis : [],
    });
    activeTab.value = dashboards.value.length - 1;
    closeDashboardDialog();
  }

  /**
   * Opens the delete flow for the provided dashboard handle when more than one dashboard exists.
   */
  function removeDashboard(handle: NonNullable<DashboardItem['handle']>) {
    if (!isDashboardRemovable.value) {
      return;
    }

    dashboardToDelete.value = dashboards.value.find((dashboard) => dashboard.handle === handle) || null;
    dashboardDeleteDialog.value = dashboardToDelete.value !== null;
  }

  /**
   * Updates the favorites drawer state through a single composable-owned state source.
   */
  function setFavoritesDrawer(value: boolean) {
    favoritesDrawer.value = value;
  }

  /**
   * Opens the favorites drawer from the dashboard shell.
   */
  function openFavoritesDrawer() {
    setFavoritesDrawer(true);
  }

  /**
   * Replaces the KPI collection for a single dashboard without reloading all dashboard data.
   */
  function updateDashboardKpis(dashboardHandle: DashboardItem['handle'], kpis: DashboardItem['kpis']) {
    const dashboardIndex = dashboards.value.findIndex((dashboard) => dashboard.handle === dashboardHandle);

    if (dashboardIndex === -1) {
      return;
    }

    dashboards.value[dashboardIndex] = {
      ...dashboards.value[dashboardIndex],
      kpis: Array.isArray(kpis) ? [...kpis] : [],
    };
  }
  // #endregion

  // #region Return
  return {
    dashboardDeleteDialog,
    dashboardToDelete,
    dashboardDialog,
    dashboardEntity,
    dashboardTemplates,
    isLoading,
    dashboards,
    activeTab,
    favoritesDrawer,
    currentPersonStore,
    currentDashboard,
    hasDashboards,
    isDashboardRemovable,
    cancelDashboardDelete,
    closeDashboardDialog,
    openDashboardDialog,
    openFavoritesDrawer,
    confirmDashboardDelete,
    onDashboardSave,
    removeDashboard,
    setFavoritesDrawer,
    updateDashboardKpis,
    loadDashboards,
    loadDashboardEntity,
    loadDashboardTemplates,
  };
  // #endregion
}
