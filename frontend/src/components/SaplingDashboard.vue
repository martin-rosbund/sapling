<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height" no-gutters>
      <!-- Main Dashboard Area -->
      <v-col cols="12" md="9" class="d-flex flex-column">
        <!-- Tabs for user-configurable dashboards -->
        <v-tabs v-model="activeTab" grow background-color="primary" dark height="44">
          <v-tab v-for="(tab, idx) in userTabs" :key="tab.id" @click="selectTab(idx)">
            <div class="d-flex align-center">
              <v-icon class="mr-1" v-if="tab.icon">{{ tab.icon }}</v-icon>
              <span class="mr-2">{{ tab.title }}</span>
              <v-btn icon size="x-small" class="ml-2" @click.stop="removeTab(idx)" v-if="userTabs.length > 1">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-tab>
          <v-tab @click.stop="openDashboardDialog" class="d-flex align-center">
            <v-icon>mdi-plus</v-icon>
          </v-tab>
    <!-- Dashboard Anlage Dialog -->
    <EntityEditDialog
      v-model="dashboardDialog"
      :mode="'create'"
      :item="null"
      :templates="dashboardTemplates"
      :entity="dashboardEntity"
      @save="onDashboardSave"
      @cancel="dashboardDialog = false"
    />
        </v-tabs>

        <!-- Tab Content: KPIs -->
        <v-window v-model="activeTab" class="flex-grow-1">
          <v-window-item
            v-for="(tab, idx) in userTabs"
            :key="tab.id"
            :value="idx"
          >
            <v-row class="pa-4" dense>
              <v-col
                v-for="(kpi, kpiIdx) in tab.kpis"
                :key="kpi.handle || kpiIdx"
                cols="12" sm="12" md="6" lg="4"
              >
                <v-card outlined class="kpi-card">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>{{ kpi.name }}</span>
                    <v-btn icon size="x-small" @click.stop="openKpiDeleteDialog(idx, kpiIdx)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                              <div v-if="kpi.groupBy && Array.isArray(getKpiTableRows(kpi)) && getKpiTableRows(kpi).length > 0" style="max-height: 140px; overflow-y: auto;">
                      <v-table density="compact" class="kpi-table">
                        <tbody>
                          <tr v-for="(row, rowIdx) in getKpiTableRows(kpi)" :key="rowIdx">
                            <td v-for="col in getKpiTableColumns(kpi)" :key="col">{{ row[col] }}</td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>
                    <div v-else class="text-h4 font-weight-bold">{{ getKpiDisplayValue(kpi) }}</div>
                    <div class="text-caption">{{ kpi.description }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <!-- Add KPI Button -->
              <v-col cols="12" sm="12" md="6" lg="4">
                <v-card outlined class="add-kpi-card d-flex align-center justify-center" @click="openAddKpiDialog(idx)">
                  <v-icon size="large">mdi-plus-circle</v-icon>
                  <span class="ml-2">KPI hinzufügen</span>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-col>

      <!-- Sideboard (Favorites) -->
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="height: 100%; max-height: 100%; min-height: 0;">
        <v-card class="sideboard-card rounded-0 d-flex flex-column" flat style="height: 100%; max-height: 100%; min-height: 0;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-star</v-icon> Favoriten
          </v-card-title>
          <v-divider></v-divider>
          <div class="sideboard-list-scroll d-flex flex-column" style="flex: 1 1 0; min-height: 0; max-height: 100%; overflow-y: auto;">
            <v-list dense>
              <v-list-item
                v-for="(fav, idx) in favorites"
                :key="fav.handle"
                @click="goToFavorite(fav)"
                class="favorite-item"
              >
                <div class="d-flex align-center justify-space-between w-100">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2">{{ fav.entity?.icon || 'mdi-bookmark' }}</v-icon>
                    <span class="ml-1">{{ fav.title }}</span>
                  </div>
                  <v-btn icon size="x-small" @click.stop="removeFavorite(idx)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
              </v-list-item>
            </v-list>
          </div>
          <v-divider></v-divider>
          <div class="d-flex align-end" style="width: 100%; flex: 0 0 auto;">
            <v-btn block color="primary" variant="text" class="justify-start text-no-wrap" style="width: 100%;" @click="openAddFavoriteDialog">
              <v-icon left>mdi-plus</v-icon>
              <span>Favorit hinzufügen</span>
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add KPI Dialog -->
    <v-dialog v-model="addKpiDialog" max-width="500">
      <v-card>
        <v-card-title>KPI hinzufügen</v-card-title>
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
          <v-btn text @click="addKpiDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="validateAndAddKpi">Hinzufügen</v-btn>
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
    <v-dialog v-model="addFavoriteDialog" max-width="500">
      <v-card>
        <v-card-title>Favorit hinzufügen</v-card-title>
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
          <v-btn text @click="addFavoriteDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="validateAndAddFavorite">Hinzufügen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
const kpiFormRef = ref<any>(null);
async function validateAndAddKpi() {
  const valid = await kpiFormRef.value?.validate();
  if (valid) {
    addKpiToTab();
  }
}
const favoriteFormRef = ref<any>(null);
async function validateAndAddFavorite() {
  const valid = await favoriteFormRef.value?.validate();
  if (valid) {
    await addFavorite();
  }
}
onMounted(async () => {
  await loadTranslation();
  await loadCurrentPerson();
  await loadDashboards();
  await loadFavorites();
  await loadEntities();
});
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
// Dashboard Delete Dialog State
const dashboardDeleteDialog = ref(false);
const dashboardToDelete = ref<DashboardItem | null>(null);

// KPI Delete Dialog State
const kpiDeleteDialog = ref(false);
const kpiToDelete = ref<KPIItem | null>(null);
const kpiDeleteTabIdx = ref<number | null>(null);
const kpiDeleteKpiIdx = ref<number | null>(null);

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
import '@/assets/styles/SaplingDashboard.css';
import type { KPIItem, PersonItem, DashboardItem, FavoriteItem, EntityItem } from '../entity/entity';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import TranslationService from '@/services/translation.service';
import EntityDeleteDialog from './dialog/EntityDeleteDialog.vue';
import EntityEditDialog from './dialog/EntityEditDialog.vue';

// Dashboard Anlage Dialog State
const dashboardDialog = ref(false);

// Dashboard Templates (vereinfachtes Beispiel, ggf. per API laden)
const dashboardTemplates = [
  {
    key: 'name',
    name: 'name',
    type: 'string',
    length: 128,
    default: '',
    isPrimaryKey: false,
    isAutoIncrement: false,
    joinColumns: [],
    kind: '',
    mappedBy: '',
    inversedBy: '',
    referenceName: '',
    isReference: false,
    isSystem: false,
    isRequired: true,
    nullable: false,
  }
];
// Dashboard Entity (vereinfachtes Beispiel)
const dashboardEntity = { handle: 'dashboard' };

// Translation service instance (reactive)
const translationService = ref(new TranslationService());

// Current Person
const currentPerson = ref<PersonItem | null>(null);

// Current Person
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
 * Loads currrent person
 */
const loadCurrentPerson = async () => {
  currentPerson.value = await ApiService.findOne<PersonItem>(`current/person`);
};
/**
 * 
 * Loads currrent person
 */
const loadEntities = async () => {
  entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { isMenu: true } })).data;
};

/**
 * Loads dashboards for current person
 */
const loadDashboards = async () => {
  if (!currentPerson.value || !currentPerson.value.handle) return;
  isLoading.value = true;
  const dashboardRes = await ApiGenericService.find<DashboardItem>('dashboard', {
    filter: { person: { handle: currentPerson.value.handle } },
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
  if (!currentPerson.value || !currentPerson.value.handle) return;
  isLoading.value = true;
  const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
    filter: { person: { handle: currentPerson.value.handle } },
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
    kpiTabIdx.value !== null &&
    selectedKpi.value &&
    dashboards.value[kpiTabIdx.value!]
  ) {
    ApiGenericService.create('kpi', {
      ...selectedKpi.value,
      dashboards: [dashboards.value[kpiTabIdx.value!].handle]
    }).then((createdKpi) => {
      userTabs.value[kpiTabIdx.value!]?.kpis.push(createdKpi);
      addKpiDialog.value = false;
    });
  }
}
function removeKpiFromTab(tabIdx: number, kpiIdx: number) {
  const kpi = userTabs.value[tabIdx]?.kpis[kpiIdx];
  if (kpi && kpi.handle) {
    ApiGenericService.delete('kpi', { handle: kpi.handle }).then(() => {
      userTabs.value[tabIdx]?.kpis.splice(kpiIdx, 1);
    });
  }
}

// Tabs Management
function openDashboardDialog() {
  dashboardDialog.value = true;
}

async function onDashboardSave(form: any) {
  if (!currentPerson.value || !currentPerson.value.handle) return;
  // Dashboard per API anlegen
  const dashboard = await ApiGenericService.create<DashboardItem>('dashboard', {
    ...form,
    person: currentPerson.value.handle
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
  if (newFavoriteTitle.value && selectedFavoriteEntity.value && currentPerson.value) {
    // Favorit per API anlegen
    const fav = await ApiGenericService.create<FavoriteItem>('favorite', {
      title: newFavoriteTitle.value,
      entity: selectedFavoriteEntity.value.handle,
      person: currentPerson.value,
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
  if (fav.entity?.route) {
    let path = fav.entity.route;
    if (fav.queryParameter) {
      path += `?${fav.queryParameter}`;
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
  ApiService.findAll(`kpi/execute/${kpi.handle}`, { signal: controller.signal })
    .then((result: any) => {
      kpiValues.value[kpi.handle] = result?.value ?? null;
    })
    .catch(() => {
      kpiValues.value[kpi.handle] = null;
    })
    .finally(() => {
      kpiLoading.value[kpi.handle] = false;
      delete kpiAbortControllers.value[kpi.handle];
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
  // Wenn groupBy vorhanden und val ist ein Array, wird die Tabelle angezeigt, also hier nur Einzelwert
  if (kpi.groupBy && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
    return '';
  }
  if (val === null || val === undefined) return '—';
  return String(val);
}

function getKpiTableRows(kpi: KPIItem): Array<Record<string, any>> {
  if (!kpi.handle) return [];
  const val = kpiValues.value[kpi.handle];
  if (kpi.groupBy && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
    return val;
  }
  return [];
}

function getKpiTableColumns(kpi: KPIItem): string[] {
  const rows = getKpiTableRows(kpi);
  if (rows.length > 0) {
    // Alle Schlüssel des ersten Objekts als Spaltennamen
    return Object.keys(rows[0]);
  }
  return [];
}
</script>
