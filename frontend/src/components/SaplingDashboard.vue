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
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardKpis from './SaplingKpis.vue';
import DashboardFavorites from './SaplingFavorites.vue';
import EntityDeleteDialog from './dialog/EntityDeleteDialog.vue';
import EntityEditDialog from './dialog/EntityEditDialog.vue';
import '@/assets/styles/SaplingDashboard.css';
import type { KPIItem, DashboardItem, FavoriteItem, EntityItem } from '../entity/entity';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import TranslationService from '@/services/translation.service';
import type { EntityTemplate } from '@/entity/structure';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
// #endregion Imports

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
const translationService = ref(new TranslationService());
const dashboardTemplates = ref<EntityTemplate[]>([]);
// #endregion Refs

// #region Store
const currentPersonStore = useCurrentPersonStore();
// #endregion Store

// #region Lifecycle
onMounted(async () => {
  await loadTranslation();
  await loadDashboardEntity();
  await currentPersonStore.fetchCurrentPerson();
  await loadDashboards();
  await loadFavorites();
  await loadEntities();
});

onUnmounted(() => {
  // Abbruch aller laufenden Requests
  Object.values(kpiAbortControllers.value).forEach(controller => controller.abort());
});
// #endregion Lifecycle

// #region Methods
async function validateAndAddKpi() {
  const valid = await kpiFormRef.value?.validate();
  if (valid) {
    addKpiToTab();
  }
}

async function validateAndAddFavorite() {
  const valid = await favoriteFormRef.value?.validate();
  if (valid) {
    await addFavorite();
  }
}

async function confirmDashboardDelete() {
  if (!dashboardToDelete.value || !dashboardToDelete.value.handle) return;
  await ApiGenericService.delete('dashboard', { handle: dashboardToDelete.value.handle });
  // Entferne aus local state
  const idx = dashboards.value.findIndex(d => d.handle === dashboardToDelete.value?.handle);
  if (idx !== -1) {
    dashboards.value.splice(idx, 1);
    userTabs.value.splice(idx, 1);
    if (activeTab.value >= userTabs.value.length) activeTab.value = userTabs.value.length - 1;
  }
  dashboardDeleteDialog.value = false;
  dashboardToDelete.value = null;
}

function cancelDashboardDelete() {
  dashboardDeleteDialog.value = false;
  dashboardToDelete.value = null;
}

// Additional methods omitted for brevity...
// #endregion Methods
const entities = ref<EntityItem[]>([]);

// Loading state
const isLoading = ref(true);

// Dashboards und Favoriten aus API
const dashboards = ref<DashboardItem[]>([]);
const favorites = ref<FavoriteItem[]>([]);
const userTabs = ref<{ id: number; title: string; icon?: string; kpis: KPIItem[] }[]>([]);
const activeTab = ref(0);

// KPI Werte: Map<kpiHandle, value>
const kpiValues = ref<Record<string | number, number | null>>({});
const kpiLoading = ref<Record<string | number, boolean>>({});
const kpiAbortControllers = ref<Record<string | number, AbortController>>({});

// KPI Dialog State
const addKpiDialog = ref(false);
const selectedKpi = ref<KPIItem | null>(null);
const kpiTabIdx = ref<number | null>(null);

// Verfügbare KPIs (werden aus Dashboards extrahiert)
const availableKpis = ref<KPIItem[]>([]);

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async () => {
  await loadTranslation();
});

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
/**
 * Prepare translations for navigation and group labels.
 */
async function loadTranslation() {
  isLoading.value = true;
  await translationService.value.prepare('global', 'dashboard', 'kpi', 'favorite', 'person');
  isLoading.value = false;
}

/**
 * 
 * Loads currrent person
 */
const loadEntities = async () => {
  entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { canShow: true } })).data;
};

/**
 * Loads dashboards for current person
 */
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
  // KPI Werte initial laden
  loadAllKpiValues();
  isLoading.value = false;
};

/**
 * Loads favorites for current person
 */
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

// Add KPI to Tab
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

// Tabs Management
async function openDashboardDialog() {
  dashboardTemplates.value = (await ApiService.findAll<EntityTemplate[]>('template/dashboard'));
  dashboardDialog.value = true;
}

async function onDashboardSave(form: any) {
  if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
  // Dashboard per API anlegen
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

// Favoriten Management
const addFavoriteDialog = ref(false);
const newFavoriteTitle = ref('');
const selectedFavoriteEntity = ref<EntityItem | null>(null);
const router = useRouter();

function openAddFavoriteDialog() {
  newFavoriteTitle.value = '';
  selectedFavoriteEntity.value = null;
  addFavoriteDialog.value = true;
}

async function addFavorite() {
  if (newFavoriteTitle.value && selectedFavoriteEntity.value && currentPersonStore.person) {
    // Favorit per API anlegen
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

// KPI Wert dynamisch laden
function loadKpiValue(kpi: KPIItem) {
  if (!kpi.handle) return;
  // Wenn schon geladen oder gerade geladen, nicht erneut
  if (kpiLoading.value[kpi.handle]) return;
  kpiLoading.value[kpi.handle] = true;
  // Abbruchcontroller für Cleanup
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
  // Alle KPIs aus allen Tabs
  const allKpis = userTabs.value.flatMap(tab => tab.kpis);
  allKpis.forEach(kpi => {
    if (kpi.handle) loadKpiValue(kpi);
  });
}

onUnmounted(() => {
  // Abbruch aller laufenden Requests
  Object.values(kpiAbortControllers.value).forEach(controller => controller.abort());
});

function getKpiDisplayValue(kpi: KPIItem): string {
  if (!kpi.handle) return '—';
  if (kpiLoading.value[kpi.handle]) return '…';
  const val = kpiValues.value[kpi.handle];
  // Zeige Einzelwert nur bei type === 'ITEM'
  if (kpi.type === 'LIST') {
    return '';
  }
  if (val === null || val === undefined) return '—';
  return String(val);
}

function getKpiTableRows(kpi: KPIItem): Array<Record<string, any>> {
  if (!kpi.handle) return [];
  const val = kpiValues.value[kpi.handle];
  // Zeige Tabelle nur bei type === 'LIST'
  if (kpi.type === 'LIST' && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
    return val;
  }
  return [];
}

function getKpiTableColumns(kpi: KPIItem): string[] {
  const rows = getKpiTableRows(kpi);
  if (rows.length > 0 && rows[0]) {
    // Alle Schlüssel des ersten Objekts als Spaltennamen
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

//#region Entity
async function loadDashboardEntity() {
    dashboardEntity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'dashboard' }, limit: 1, page: 1 })).data[0] || null;
};
//#endregion

</script>
