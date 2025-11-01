<template>
      <v-skeleton-loader
      v-if="isLoading || !currentPersonStore.loaded"
      elevation="12"
      class="fill-height"
      type="paragraph"/>
    <template v-else>
      <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
          <!-- Main Dashboard Area -->
          <v-col cols="12" md="9" class="d-flex flex-column sapling-dashboard-main">
            <!-- Tabs for user-configurable dashboards -->
            <v-tabs v-model="activeTab" grow background-color="primary" dark height="44" class="sapling-dashboard-tabs">
              <v-tab v-for="(tab, idx) in userTabs" :key="tab.id" @click="selectTab(idx)">
                <div class="d-flex align-center sapling-dashboard-tab">
                  <v-icon class="mr-1" v-if="tab.icon">{{ tab.icon }}</v-icon>
                  <span class="mr-2">{{ tab.title }}</span>
                  <v-btn icon size="x-small" class="ml-2" @click.stop="removeTab(idx)" v-if="userTabs.length > 1">
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </div>
              </v-tab>
              <v-tab @click.stop="openDashboardDialog" class="d-flex align-center sapling-dashboard-tab-add">
                <v-icon>mdi-plus</v-icon>
              </v-tab>
        <!-- Dashboard Anlage Dialog -->
        <EntityEditDialog
          v-model="dashboardDialog"
          :mode="'create'"
          :item="null"
          :templates="dashboardTemplates || []"
          :entity="dashboardEntity"
          @save="onDashboardSave"
          @cancel="dashboardDialog = false"
        />
            </v-tabs>
            <DashboardKpis
              :userTabs="userTabs"
              :activeTab="activeTab"
              :openKpiDeleteDialog="openKpiDeleteDialog"
              :openAddKpiDialog="openAddKpiDialog"
              :getKpiTableRows="getKpiTableRows"
              :getKpiTableColumns="getKpiTableColumns"
              :getKpiDisplayValue="getKpiDisplayValue"
              :getKpiTrendValue="getKpiTrendValue"
              :getKpiSparklineData="getKpiSparklineData"
            />
          </v-col>

          <v-col cols="12" md="3" class="sapling-sideboard d-flex flex-column">
            <DashboardFavorites
              :favorites="favorites"
              :goToFavorite="goToFavorite"
              :removeFavorite="removeFavorite"
              :openAddFavoriteDialog="openAddFavoriteDialog"
            />
          </v-col>
        </v-row>

        <!-- Add KPI Dialog -->
        <v-dialog v-model="addKpiDialog" max-width="500" class="sapling-add-kpi-dialog">
          <v-card>
            <v-card-title>{{ $t('global.add') }}</v-card-title>
            <v-card-text>
              <v-form ref="kpiFormRef">
                <v-select
                  v-model="selectedKpi"
                  :items="availableKpis"
                  item-title="name"
                  item-value="handle"
                  label="KPI auswählen"
                  return-object
                  :rules="[v => !!v || 'KPI ist erforderlich']"
                  required
                />
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text @click="addKpiDialog = false">{{ $t('global.cancel') }}</v-btn>
              <v-btn color="primary" @click="validateAndAddKpi">{{ $t('global.add') }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <EntityDeleteDialog
          v-model:modelValue="dashboardDeleteDialog"
          :item="dashboardToDelete"
          @confirm="confirmDashboardDelete"
          @cancel="cancelDashboardDelete"
        />

        <EntityDeleteDialog
          v-model:modelValue="kpiDeleteDialog"
          :item="kpiToDelete"
          @confirm="confirmKpiDelete"
          @cancel="cancelKpiDelete"
        />

        <!-- Add Favorite Dialog (Prototyp) -->
        <v-dialog v-model="addFavoriteDialog" max-width="500" class="sapling-add-favorite-dialog">
          <v-card>
            <v-card-title>{{ $t('global.add') }}</v-card-title>
            <v-card-text>
              <v-form ref="favoriteFormRef">
                <v-text-field
                  v-model="newFavoriteTitle"
                  label="Titel"
                  :rules="[v => !!v || 'Titel ist erforderlich']"
                  required
                />
                <v-select
                  v-model="selectedFavoriteEntity"
                  :items="entities"
                  item-title="handle"
                  item-value="handle"
                  label="Entity auswählen"
                  return-object
                  :rules="[v => !!v || 'Entity ist erforderlich']"
                  required
                />
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text @click="addFavoriteDialog = false">{{ $t('global.cancel') }}</v-btn>
              <v-btn color="primary" @click="validateAndAddFavorite">{{ $t('global.add') }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </template>
</template>

<script setup lang="ts">
// #region Imports
// Import necessary modules and components
import { ref, watch, onMounted, onUnmounted } from 'vue'; // Vue composition API functions
import { useRouter } from 'vue-router'; // Vue Router for navigation
import DashboardKpis from './SaplingKpis.vue'; // Dashboard KPIs component
import DashboardFavorites from './SaplingFavorites.vue'; // Dashboard Favorites component
import EntityDeleteDialog from './dialog/EntityDeleteDialog.vue'; // Entity delete dialog
import EntityEditDialog from './dialog/EntityEditDialog.vue'; // Entity edit dialog
import '@/assets/styles/SaplingDashboard.css'; // Dashboard styles
import type { KPIItem, DashboardItem, FavoriteItem, EntityItem } from '../entity/entity'; // Entity types
import { i18n } from '@/i18n'; // Internationalization instance
import ApiService from '@/services/api.service'; // API service
import ApiGenericService from '@/services/api.generic.service'; // Generic API service
import TranslationService from '@/services/translation.service'; // Translation service
import type { EntityTemplate } from '@/entity/structure'; // Entity template type
import { useCurrentPersonStore } from '@/stores/currentPersonStore'; // Pinia store for current user
// #endregion

// #region Refs
// Reactive references for forms, dialogs, state, and data
const kpiFormRef = ref<any>(null); // KPI form reference
const favoriteFormRef = ref<any>(null); // Favorite form reference
const dashboardDeleteDialog = ref(false); // Dashboard delete dialog state
const dashboardToDelete = ref<DashboardItem | null>(null); // Dashboard to delete
const kpiDeleteDialog = ref(false); // KPI delete dialog state
const kpiToDelete = ref<KPIItem | null>(null); // KPI to delete
const kpiDeleteTabIdx = ref<number | null>(null); // Tab index for KPI delete
const kpiDeleteKpiIdx = ref<number | null>(null); // KPI index for KPI delete
const dashboardDialog = ref(false); // Dashboard dialog state
const dashboardEntity = ref<EntityItem | null>(null); // Dashboard entity
const translationService = ref(new TranslationService()); // Translation service instance
const dashboardTemplates = ref<EntityTemplate[]>([]); // Dashboard templates
const addFavoriteDialog = ref(false); // Add favorite dialog state
const newFavoriteTitle = ref(''); // New favorite title
const selectedFavoriteEntity = ref<EntityItem | null>(null); // Selected favorite entity
const router = useRouter(); // Router instance
const entities = ref<EntityItem[]>([]); // List of entities
const isLoading = ref(true); // Loading state
const dashboards = ref<DashboardItem[]>([]); // Dashboards from API
const favorites = ref<FavoriteItem[]>([]); // Favorites from API
const userTabs = ref<{ id: number; title: string; icon?: string; kpis: KPIItem[] }[]>([]); // User dashboard tabs
const activeTab = ref(0); // Active tab index
const kpiValues = ref<Record<string | number, number | null>>({}); // KPI values
const kpiLoading = ref<Record<string | number, boolean>>({}); // KPI loading state
const kpiAbortControllers = ref<Record<string | number, AbortController>>({}); // KPI abort controllers
const addKpiDialog = ref(false); // Add KPI dialog state
const selectedKpi = ref<KPIItem | null>(null); // Selected KPI
const kpiTabIdx = ref<number | null>(null); // Tab index for adding KPI
const availableKpis = ref<KPIItem[]>([]); // Available KPIs
// #endregion

// #region Stores
// Access the current person/user store
const currentPersonStore = useCurrentPersonStore();
// #endregion

// #region Lifecycle
// On component mount, load translations, entities, dashboards, favorites, and user data
onMounted(async () => {
  await loadTranslation();
  await loadDashboardEntity();
  await currentPersonStore.fetchCurrentPerson();
  await loadDashboards();
  await loadFavorites();
  await loadEntities();
});

// On component unmount, abort all running KPI requests
onUnmounted(() => {
  Object.values(kpiAbortControllers.value).forEach(controller => controller.abort());
});

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async () => {
  await loadTranslation();
});
// #endregion

// #region Dashboard
// Loads dashboards for current person
const loadDashboards = async () => {
  if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
  isLoading.value = true;
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
  isLoading.value = false;
};

// Cancel dashboard delete dialog
function cancelDashboardDelete() {
  dashboardDeleteDialog.value = false;
  dashboardToDelete.value = null;
}

// Open dashboard creation dialog
async function openDashboardDialog() {
  dashboardTemplates.value = (await ApiService.findAll<EntityTemplate[]>('template/dashboard'));
  dashboardDialog.value = true;
}

// Confirm dashboard deletion
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

// Handle dashboard save event
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

// Remove a dashboard tab
function removeTab(idx: number) {
  if (userTabs.value.length > 1) {
    dashboardToDelete.value = dashboards.value[idx] || null;
    dashboardDeleteDialog.value = true;
  }
}

// Select a dashboard tab
function selectTab(idx: number) {
  activeTab.value = idx;
}
// #endregion

// #region Favorites
// Loads favorites for current person
const loadFavorites = async () => {
  if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
  isLoading.value = true;
  const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
    filter: { person: { handle: currentPersonStore.person.handle } },
    relations: ['entity']
  });
  favorites.value = favoriteRes.data || [];
  isLoading.value = false;
};

// Validate and add a new favorite
async function validateAndAddFavorite() {
  const valid = await favoriteFormRef.value?.validate();
  if (valid) {
    await addFavorite();
  }
}

// Open add favorite dialog
function openAddFavoriteDialog() {
  newFavoriteTitle.value = '';
  selectedFavoriteEntity.value = null;
  addFavoriteDialog.value = true;
}

// Add a new favorite
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

// Remove a favorite
async function removeFavorite(idx: number) {
  const fav = favorites.value[idx];
  if (fav && fav.handle) {
    await ApiGenericService.delete('favorite', { handle: fav.handle });
  }
  favorites.value.splice(idx, 1);
}

// Navigate to a favorite's entity route
function goToFavorite(fav: FavoriteItem) {
  if (fav.entity && typeof fav.entity === 'object' && 'route' in fav.entity && typeof fav.entity.route === 'string') {
    let path = fav.entity.route;
    if (fav.filter) {
      path += `?filter=${fav.filter}`;
    }
    router.push(path);
  }
}
// #endregion

// #region KPI
// Validate and add a new KPI
async function validateAndAddKpi() {
  const valid = await kpiFormRef.value?.validate();
  if (valid) {
    addKpiToTab();
  }
}

// Open KPI delete dialog
function openKpiDeleteDialog(tabIdx: number, kpiIdx: number) {
  kpiDeleteTabIdx.value = tabIdx;
  kpiDeleteKpiIdx.value = kpiIdx;
  kpiToDelete.value = userTabs.value[tabIdx]?.kpis[kpiIdx] || null;
  kpiDeleteDialog.value = true;
}

// Confirm KPI deletion
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

// Cancel KPI delete dialog
function cancelKpiDelete() {
  kpiDeleteDialog.value = false;
  kpiToDelete.value = null;
  kpiDeleteTabIdx.value = null;
  kpiDeleteKpiIdx.value = null;
}

// Open add KPI dialog
function openAddKpiDialog(tabIdx: number) {
  kpiTabIdx.value = tabIdx;
  selectedKpi.value = null;
  addKpiDialog.value = true;
}

// Add KPI to selected tab
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

// Load KPI value dynamically
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

// Load all KPI values for all tabs
function loadAllKpiValues() {
  const allKpis = userTabs.value.flatMap(tab => tab.kpis);
  allKpis.forEach(kpi => {
    if (kpi.handle) loadKpiValue(kpi);
  });
}

// Get display value for KPI
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

// Get table rows for KPI
function getKpiTableRows(kpi: KPIItem): Array<Record<string, any>> {
  if (!kpi.handle) return [];
  const val = kpiValues.value[kpi.handle];
  if (kpi.type === 'LIST' && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
    return val;
  }
  return [];
}

// Get table columns for KPI
function getKpiTableColumns(kpi: KPIItem): string[] {
  const rows = getKpiTableRows(kpi);
  if (rows.length > 0 && rows[0]) {
    return Object.keys(rows[0]);
  }
  return [];
}

// Get sparkline data for KPI
function getKpiSparklineData(kpi: KPIItem): Array<{ month: number, year: number, value: number }> {
  if (!kpi.handle) return [];
  const val = kpiValues.value[kpi.handle];
  if (Array.isArray(val) && val.length && typeof val[0] === 'object' && 'month' in val[0] && 'year' in val[0] && 'value' in val[0]) {
    return val as Array<{ month: number, year: number, value: number }>;
  }
  return [];
}

// Get trend value for KPI
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

// #region Translations
// Prepare translations for navigation and group labels
async function loadTranslation() {
  isLoading.value = true;
  await translationService.value.prepare('global', 'dashboard', 'kpi', 'favorite', 'person');
  isLoading.value = false;
}
// #endregion

// #region Entities
// Loads all entities that can be shown
const loadEntities = async () => {
  entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { canShow: true } })).data;
};

// Loads the dashboard entity
async function loadDashboardEntity() {
    dashboardEntity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'dashboard' }, limit: 1, page: 1 })).data[0] || null;
};
// #endregion
</script>