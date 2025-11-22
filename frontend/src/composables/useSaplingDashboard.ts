import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import type { KPIItem, DashboardItem, FavoriteItem, EntityItem } from '../entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';

export function useSaplingDashboard() {
  // #region Refs
  const kpiFormRef = ref<any>(null);
  const favoriteFormRef = ref<any>(null);
  const dashboardDeleteDialog = ref(false);
  const dashboardToDelete = ref<DashboardItem | null>(null);
  const kpiDeleteDialog = ref(false);
  const kpiToDelete = ref<KPIItem | null>(null);
  const kpiDeleteTabIdx = ref<number | null>(null);
  const kpiDeleteKpiIdx = ref<number | null>(null);
  const dashboardDialog = ref(false);
  const dashboardEntity = ref<EntityItem | null>(null);
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('global', 'dashboard', 'kpi', 'favorite', 'person');
  const dashboardTemplates = ref<EntityTemplate[]>([]);
  const addFavoriteDialog = ref(false);
  const newFavoriteTitle = ref('');
  const selectedFavoriteEntity = ref<EntityItem | null>(null);
  const router = useRouter();
  const entities = ref<EntityItem[]>([]);
  const dashboards = ref<DashboardItem[]>([]);
  const favorites = ref<FavoriteItem[]>([]);
  const userTabs = ref<{ id: number; title: string; icon?: string; kpis: KPIItem[] }[]>([]);
  const activeTab = ref(0);
  const kpiValues = ref<Record<string | number, number | null>>({});
  const kpiLoading = ref<Record<string | number, boolean>>({});
  const kpiAbortControllers = ref<Record<string | number, AbortController>>({});
  const addKpiDialog = ref(false);
  const selectedKpi = ref<KPIItem | null>(null);
  const kpiTabIdx = ref<number | null>(null);
  const availableKpis = ref<KPIItem[]>([]);
  const currentPersonStore = useCurrentPersonStore();
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await loadTranslations();
    await loadDashboardEntity();
    await loadDashboardTemplates();
    await currentPersonStore.fetchCurrentPerson();
    await loadDashboards();
    await loadFavorites();
    await loadEntities();
  });

  onUnmounted(() => {
    Object.values(kpiAbortControllers.value).forEach(controller => controller.abort());
  });

  // Translation reload handled by useTranslationLoader
  // #endregion

  // #region Dashboard
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
    availableKpis.value = (await ApiGenericService.find<KPIItem>('kpi')).data;
    loadAllKpiValues();
  };
  
  async function loadDashboardTemplates() {
    dashboardTemplates.value = await ApiService.findAll<EntityTemplate[]>(`template/dashboard`);
  }

  function cancelDashboardDelete() {
    dashboardDeleteDialog.value = false;
    dashboardToDelete.value = null;
  }

  async function openDashboardDialog() {
    dashboardDialog.value = true;
  }

  async function confirmDashboardDelete() {
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
  }

  async function onDashboardSave(form: any) {
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
  }

  function removeTab(idx: number) {
    if (userTabs.value.length > 1) {
      dashboardToDelete.value = dashboards.value[idx] || null;
      dashboardDeleteDialog.value = true;
    }
  }

  function selectTab(idx: number) {
    activeTab.value = idx;
  }
  // #endregion

  // #region Favorites
  const loadFavorites = async () => {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
    const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
      filter: { person: { handle: currentPersonStore.person.handle } },
      relations: ['entity']
    });
    favorites.value = favoriteRes.data || [];
  };

  async function validateAndAddFavorite() {
    const valid = await favoriteFormRef.value?.validate();
    if (valid) {
      await addFavorite();
    }
  }

  function openAddFavoriteDialog() {
    newFavoriteTitle.value = '';
    selectedFavoriteEntity.value = null;
    addFavoriteDialog.value = true;
  }

  async function addFavorite() {
    if (newFavoriteTitle.value && selectedFavoriteEntity.value && currentPersonStore.person) {
      const fav = await ApiGenericService.create<FavoriteItem>('favorite', {
        title: newFavoriteTitle.value,
        entity: selectedFavoriteEntity.value.handle,
        person: currentPersonStore.person.handle,
        createdAt: new Date(),
      });
      favorites.value.push(fav);
      addFavoriteDialog.value = false;
    }
  }

  async function removeFavorite(idx: number) {
    const fav = favorites.value[idx];
    if (fav && fav.handle) {
      await ApiGenericService.delete('favorite', { handle: fav.handle });
    }
    favorites.value.splice(idx, 1);
  }

  function goToFavorite(fav: FavoriteItem) {
    if (fav.entity && typeof fav.entity === 'object' && 'route' in fav.entity && typeof fav.entity.route === 'string') {
      let path = fav.entity.route;
      if (fav.filter) {
        path += `?filter=${fav.filter}`;
      }
      router.push(path);
    }
  }

    const entityOptions = computed(() =>
      entities.value.map(e => ({
        title: i18n.global.t(`navigation.${e.handle}`),
        value: e.handle,
        icon: e.icon
      }))
    );
  // #endregion

  // #region KPI
  async function validateAndAddKpi() {
    const valid = await kpiFormRef.value?.validate();
    if (valid) {
      addKpiToTab();
    }
  }

  function openKpiDeleteDialog(tabIdx: number, kpiIdx: number) {
    kpiDeleteTabIdx.value = tabIdx;
    kpiDeleteKpiIdx.value = kpiIdx;
    kpiToDelete.value = userTabs.value[tabIdx]?.kpis[kpiIdx] || null;
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
      userTabs.value[kpiDeleteTabIdx.value]?.kpis.splice(kpiDeleteKpiIdx.value, 1);
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

  function openAddKpiDialog(tabIdx: number) {
    kpiTabIdx.value = tabIdx;
    selectedKpi.value = null;
    addKpiDialog.value = true;
  }

  function addKpiToTab() {
    if (
      typeof kpiTabIdx.value === 'number' &&
      selectedKpi.value &&
      Array.isArray(dashboards.value) &&
      dashboards.value.length > kpiTabIdx.value &&
      Array.isArray(userTabs.value) &&
      userTabs.value.length > kpiTabIdx.value
    ) {
      const dashboardHandle = dashboards.value[kpiTabIdx.value]?.handle;
      ApiGenericService.create('kpi', {
        ...selectedKpi.value,
        dashboards: dashboardHandle ? [dashboardHandle] : [],
      }).then((createdKpi) => {
        const tab = typeof kpiTabIdx.value === 'number' ? userTabs.value[kpiTabIdx.value] : undefined;
        if (tab && Array.isArray(tab.kpis)) {
          (tab.kpis as KPIItem[]).push(createdKpi as KPIItem);
        }
        addKpiDialog.value = false;
      });
    }
  }

  function loadKpiValue(kpi: KPIItem) {
    if (!kpi.handle) return;
    if (kpiLoading.value[kpi.handle]) return;
    kpiLoading.value[kpi.handle] = true;
    const controller = new AbortController();
    kpiAbortControllers.value[kpi.handle] = controller;
    ApiService.findAll(`kpi/execute/${kpi.handle}`)
      .then((result: any) => {
        if (kpi.handle != null) {
          kpiValues.value[String(kpi.handle)] = result?.value ?? null;
        }
      })
      .catch(() => {
        if (kpi.handle != null) {
          kpiValues.value[String(kpi.handle)] = null;
        }
      })
      .finally(() => {
        if (kpi.handle != null) {
          kpiLoading.value[String(kpi.handle)] = false;
          delete kpiAbortControllers.value[String(kpi.handle)];
        }
      });
  }

  function loadAllKpiValues() {
    const allKpis = userTabs.value.flatMap(tab => tab.kpis);
    allKpis.forEach(kpi => {
      if (kpi.handle) loadKpiValue(kpi);
    });
  }

  function getKpiDisplayValue(kpi: KPIItem): string {
    if (!kpi.handle) return '—';
    if (kpiLoading.value[kpi.handle]) return '…';
    const val = kpiValues.value[kpi.handle];
    if (kpi.type === 'LIST') {
      return '';
    }
    if (val === null || val === undefined) return '—';
    return String(val);
  }

  function getKpiTableRows(kpi: KPIItem): Array<Record<string, any>> {
    if (!kpi.handle) return [];
    const val = kpiValues.value[kpi.handle];
    if (kpi.type === 'LIST' && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      return val;
    }
    return [];
  }

  function getKpiTableColumns(kpi: KPIItem): string[] {
    const rows = getKpiTableRows(kpi);
    if (rows.length > 0 && rows[0]) {
      return Object.keys(rows[0]);
    }
    return [];
  }

  function getKpiSparklineData(kpi: KPIItem): Array<{ month: number, year: number, value: number }> {
    if (!kpi.handle) return [];
    const val = kpiValues.value[kpi.handle];
    if (Array.isArray(val) && val.length && typeof val[0] === 'object' && 'month' in val[0] && 'year' in val[0] && 'value' in val[0]) {
      return val as Array<{ month: number, year: number, value: number }>;
    }
    return [];
  }

  function getKpiTrendValue(kpi: KPIItem): { current: number, previous: number } {
    if (!kpi.handle) return { current: 0, previous: 0 };
    const val = kpiValues.value[kpi.handle];
    if (
      val &&
      typeof val === 'object' &&
      val !== null &&
      'current' in val &&
      'previous' in val &&
      typeof (val as any).current === 'number' &&
      typeof (val as any).previous === 'number'
    ) {
      return { current: Number((val as any).current), previous: Number((val as any).previous) };
    }
    return { current: 0, previous: 0 };
  }
  // #endregion

  // #region Entities
  const loadEntities = async () => {
    entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { canShow: true } })).data;
  };

  async function loadDashboardEntity() {
    dashboardEntity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'dashboard' }, limit: 1, page: 1 })).data[0] || null;
  };
  // #endregion

  return {
    // Refs
    kpiFormRef,
    favoriteFormRef,
    dashboardDeleteDialog,
    dashboardToDelete,
    kpiDeleteDialog,
    kpiToDelete,
    kpiDeleteTabIdx,
    kpiDeleteKpiIdx,
    dashboardDialog,
    dashboardEntity,
    translationService,
    dashboardTemplates,
    addFavoriteDialog,
    newFavoriteTitle,
    selectedFavoriteEntity,
    router,
    entities,
    isLoading,
    dashboards,
    favorites,
    userTabs,
    activeTab,
    kpiValues,
    kpiLoading,
    kpiAbortControllers,
    addKpiDialog,
    selectedKpi,
    kpiTabIdx,
    availableKpis,
    currentPersonStore,
    // Methods
    loadDashboards,
    cancelDashboardDelete,
    openDashboardDialog,
    confirmDashboardDelete,
    onDashboardSave,
    removeTab,
    selectTab,
    loadFavorites,
    validateAndAddFavorite,
    openAddFavoriteDialog,
    addFavorite,
    removeFavorite,
    goToFavorite,
    validateAndAddKpi,
    openKpiDeleteDialog,
    confirmKpiDelete,
    cancelKpiDelete,
    openAddKpiDialog,
    addKpiToTab,
    loadKpiValue,
    loadAllKpiValues,
    getKpiDisplayValue,
    getKpiTableRows,
    getKpiTableColumns,
    getKpiSparklineData,
    getKpiTrendValue,
    loadTranslations,
    loadEntities,
    loadDashboardEntity,
    entityOptions,
  };
}
