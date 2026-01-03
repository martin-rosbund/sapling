
import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import type { DashboardItem, EntityItem } from '../../entity/entity';
import type { EntityTemplate } from '@/entity/structure';

export function useSaplingDashboard() {
  // State
  const dashboardDeleteDialog = ref(false);
  const dashboardToDelete = ref<DashboardItem | null>(null);
  const dashboardDialog = ref(false);
  const dashboardEntity = ref<EntityItem | null>(null);
  const dashboardTemplates = ref<EntityTemplate[]>([]);
  const dashboards = ref<DashboardItem[]>([]);
  const activeTab = ref(0);
  const entities = ref<EntityItem[]>([]);
  const currentPersonStore = useCurrentPersonStore();
  const { isLoading, loadTranslations } = useTranslationLoader('global', 'dashboard', 'kpi', 'favorite', 'person');

  // Lifecycle
  onMounted(async () => {
    await loadTranslations();
    await loadDashboardEntity();
    await loadDashboardTemplates();
    await currentPersonStore.fetchCurrentPerson();
    await loadDashboards();
    await loadEntities();
  });

  // Dashboard logic
  const loadDashboards = async () => {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
    const dashboardRes = await ApiGenericService.find<DashboardItem>('dashboard', {
      filter: { person: { handle: currentPersonStore.person.handle } },
      relations: ['kpis']
    });
    dashboards.value = dashboardRes.data || [];
  };

  const loadDashboardTemplates = async () => {
    dashboardTemplates.value = await ApiService.findAll<EntityTemplate[]>(`template/dashboard`);
  };

  const cancelDashboardDelete = () => {
    dashboardDeleteDialog.value = false;
    dashboardToDelete.value = null;
  };

  const openDashboardDialog = () => {
    dashboardDialog.value = true;
  };

  const confirmDashboardDelete = async () => {
    if (!dashboardToDelete.value || !dashboardToDelete.value.handle) return;
    await ApiGenericService.delete('dashboard', { handle: dashboardToDelete.value.handle });
    const idx = dashboards.value.findIndex(d => d.handle === dashboardToDelete.value?.handle);
    if (idx !== -1) {
      dashboards.value.splice(idx, 1);
      if (activeTab.value >= dashboards.value.length) activeTab.value = dashboards.value.length - 1;
    }
    dashboardDeleteDialog.value = false;
    dashboardToDelete.value = null;
  };

  interface DashboardForm {
    name: string;
    [key: string]: unknown;
  }

  const onDashboardSave = async (form: DashboardForm) => {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
    const dashboard = await ApiGenericService.create<DashboardItem>('dashboard', {
      ...form,
      person: currentPersonStore.person.handle
    });
    dashboards.value.push(dashboard);
    activeTab.value = dashboards.value.length - 1;
    dashboardDialog.value = false;
  };

  const removeDashboard = (handle: string | number) => {
    if (dashboards.value.length > 1) {
      dashboardToDelete.value = dashboards.value.find(d => d.handle === handle) || null;
      dashboardDeleteDialog.value = true;
    }
  };

  // Entities
  const loadEntities = async () => {
    entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { canShow: true } })).data;
  };

  const loadDashboardEntity = async () => {
    dashboardEntity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'dashboard' }, limit: 1, page: 1 })).data[0] || null;
  };

  return {
    dashboardDeleteDialog,
    dashboardToDelete,
    dashboardDialog,
    dashboardEntity,
    dashboardTemplates,
    isLoading,
    dashboards,
    activeTab,
    currentPersonStore,
    entities,
    cancelDashboardDelete,
    openDashboardDialog,
    confirmDashboardDelete,
    onDashboardSave,
    removeDashboard,
    loadEntities,
    loadDashboards,
    loadDashboardEntity,
    loadDashboardTemplates,
  };
}
