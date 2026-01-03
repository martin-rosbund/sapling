
import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import type { KPIItem, DashboardItem, EntityItem } from '../../entity/entity';
import type { EntityTemplate } from '@/entity/structure';

export function useSaplingDashboard() {
  // State
  const dashboardDeleteDialog = ref(false);
  const dashboardToDelete = ref<DashboardItem | null>(null);
  const dashboardDialog = ref(false);
  const dashboardEntity = ref<EntityItem | null>(null);
  const dashboardTemplates = ref<EntityTemplate[]>([]);
  const dashboards = ref<DashboardItem[]>([]);
  const userTabs = ref<{ id: number; title: string; icon?: string; kpis: KPIItem[] }[]>([]);
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
    userTabs.value = dashboards.value.map((d, idx) => ({
      id: typeof d.handle === 'number' ? d.handle : idx + 1,
      title: d.name,
      icon: 'mdi-view-dashboard',
      kpis: d.kpis || [],
    }));
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
      userTabs.value.splice(idx, 1);
      if (activeTab.value >= userTabs.value.length) activeTab.value = userTabs.value.length - 1;
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
    userTabs.value.push({
      id: typeof dashboard.handle === 'number' ? dashboard.handle : dashboards.value.length,
      title: dashboard.name,
      icon: 'mdi-view-dashboard-outline',
      kpis: dashboard.kpis || [],
    });
    activeTab.value = userTabs.value.length - 1;
    dashboardDialog.value = false;
  };

  const removeTab = (idx: number) => {
    if (userTabs.value.length > 1) {
      dashboardToDelete.value = dashboards.value[idx] || null;
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
    userTabs,
    dashboards,
    activeTab,
    currentPersonStore,
    cancelDashboardDelete,
    openDashboardDialog,
    confirmDashboardDelete,
    onDashboardSave,
    removeTab,
    entities,
    loadEntities,
    loadDashboards,
    loadDashboardEntity,
    loadDashboardTemplates,
  };
}
