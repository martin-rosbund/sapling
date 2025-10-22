<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height" no-gutters>
      <!-- Main Dashboard Area -->
      <v-col cols="12" md="9" class="d-flex flex-column">
        <!-- Tabs for user-configurable dashboards -->
        <v-tabs v-model="activeTab" grow background-color="primary" dark height="44">
          <v-tab v-for="(tab, idx) in userTabs" :key="tab.id" @click="selectTab(idx)">
            <v-icon left v-if="tab.icon">{{ tab.icon }}</v-icon>
            {{ tab.title }}
            <v-btn icon size="x-small" @click.stop="removeTab(idx)" v-if="userTabs.length > 1">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-tab>
          <v-tab @click.stop="addTab" class="d-flex align-center">
            <v-icon>mdi-plus</v-icon>
          </v-tab>
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
                cols="12" sm="6" md="4" lg="3"
              >
                <v-card outlined class="kpi-card">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span>{{ kpi.name }}</span>
                    <v-btn icon size="x-small" @click.stop="removeKpiFromTab(idx, kpiIdx)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <div class="text-h4 font-weight-bold">{{ getKpiDisplayValue(kpi) }}</div>
                    <div class="text-caption">{{ kpi.description }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <!-- Add KPI Button -->
              <v-col cols="12" sm="6" md="4" lg="3">
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
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;">
        <v-card class="sideboard-card rounded-0" flat>
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-star</v-icon> Favoriten
          </v-card-title>
          <v-divider></v-divider>
          <v-list dense>
            <v-list-item
              v-for="(fav, idx) in favorites"
              :key="fav.id"
              @click="goToFavorite(fav)"
              class="favorite-item"
            >
              <v-icon class="mr-2">{{ fav.icon || 'mdi-bookmark' }}</v-icon>
              <div>
                <div class="v-list-item-title">{{ fav.title }}</div>
                <div v-if="fav.subtitle" class="v-list-item-subtitle">{{ fav.subtitle }}</div>
              </div>
              <v-list-item-action>
                <v-btn icon size="x-small" @click.stop="removeFavorite(idx)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>
          <v-divider></v-divider>
          <v-btn block color="primary" variant="text" @click="openAddFavoriteDialog">
            <v-icon left>mdi-plus</v-icon> Favorit hinzufügen
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add KPI Dialog -->
    <v-dialog v-model="addKpiDialog" max-width="500">
      <v-card>
        <v-card-title>KPI hinzufügen</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedKpi"
            :items="availableKpis"
            item-title="name"
            item-value="handle"
            label="KPI auswählen"
            return-object
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="addKpiDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="addKpiToTab">Hinzufügen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Favorite Dialog (Prototyp) -->
    <v-dialog v-model="addFavoriteDialog" max-width="500">
      <v-card>
        <v-card-title>Favorit hinzufügen</v-card-title>
        <v-card-text>
          <v-text-field v-model="newFavoriteTitle" label="Titel" />
          <v-text-field v-model="newFavoriteSubtitle" label="Untertitel (optional)" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="addFavoriteDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="addFavorite">Hinzufügen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { KPIItem } from '../entity/entity';

// Prototyp: User Tabs (könnten später aus User-Settings geladen werden)
const userTabs = ref([
  {
    id: 1,
    title: 'Mein Dashboard',
    icon: 'mdi-view-dashboard',
    kpis: [] as KPIItem[],
  },
]);
const activeTab = ref(0);

// Prototyp: Favoriten (könnten später aus User-Settings geladen werden)
interface FavoriteItem {
  id: number;
  title: string;
  icon?: string;
  subtitle?: string;
}
const favorites = ref<FavoriteItem[]>([
  { id: 1, title: 'Tickets', icon: 'mdi-ticket', subtitle: 'Meine offenen Tickets' },
  { id: 2, title: 'Notizen', icon: 'mdi-note', subtitle: 'Wichtige Notizen' },
]);

// KPI Dialog State
const addKpiDialog = ref(false);
const selectedKpi = ref<KPIItem | null>(null);
const kpiTabIdx = ref<number | null>(null);

// Prototyp: Verfügbare KPIs (später aus API laden)
const availableKpis = ref<KPIItem[]>([
  { handle: 1, name: 'Offene Tickets', description: 'Anzahl offener Tickets', aggregation: 'count', field: 'status', createdAt: null, updatedAt: null },
  { handle: 2, name: 'Durchschnittliche Antwortzeit', description: 'Ø Antwortzeit in h', aggregation: 'avg', field: 'responseTimeHours', createdAt: null, updatedAt: null },
]);

// Add KPI to Tab
function openAddKpiDialog(tabIdx: number) {
  kpiTabIdx.value = tabIdx;
  selectedKpi.value = null;
  addKpiDialog.value = true;
}
function addKpiToTab() {
  if (kpiTabIdx.value !== null && selectedKpi.value) {
    userTabs.value[kpiTabIdx.value!]?.kpis.push({ ...selectedKpi.value });
    addKpiDialog.value = false;
  }
}
function removeKpiFromTab(tabIdx: number, kpiIdx: number) {
  userTabs.value[tabIdx]?.kpis.splice(kpiIdx, 1);
}

// Tabs Management
function addTab() {
  const newId = userTabs.value.length + 1;
  userTabs.value.push({ id: newId, title: `Dashboard ${newId}`, icon: 'mdi-view-dashboard-outline', kpis: [] });
  activeTab.value = userTabs.value.length - 1;
}
function removeTab(idx: number) {
  if (userTabs.value.length > 1) {
    userTabs.value.splice(idx, 1);
    if (activeTab.value >= userTabs.value.length) activeTab.value = userTabs.value.length - 1;
  }
}
function selectTab(idx: number) {
  activeTab.value = idx;
}

// Favoriten Management
const addFavoriteDialog = ref(false);
const newFavoriteTitle = ref('');
const newFavoriteSubtitle = ref('');
function openAddFavoriteDialog() {
  newFavoriteTitle.value = '';
  newFavoriteSubtitle.value = '';
  addFavoriteDialog.value = true;
}
function addFavorite() {
  if (newFavoriteTitle.value) {
    favorites.value.push({
      id: Date.now(),
      title: newFavoriteTitle.value,
      icon: 'mdi-star-outline',
      subtitle: newFavoriteSubtitle.value,
    });
    addFavoriteDialog.value = false;
  }
}
function removeFavorite(idx: number) {
  favorites.value.splice(idx, 1);
}
function goToFavorite(fav: FavoriteItem) {
  // Prototyp: Navigation zu Favorit (später Routing)
  alert(`Navigiere zu: ${fav.title}`);
}

// Dummy-Anzeige für KPI-Wert (später durch echten Wert ersetzen)
function getKpiDisplayValue(kpi: KPIItem): string {
  // Hier könnte später eine Berechnung oder API-Anfrage stehen
  if (kpi.aggregation === 'count') return '42';
  if (kpi.aggregation === 'avg') return '3.5';
  return '—';
}
</script>

<style scoped>
.kpi-card {
  min-height: 140px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.kpi-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.add-kpi-card {
  height: 200px;
  border-style: dashed;
  color: #1976d2;
  cursor: pointer;
  transition: 0.2s;
}
.add-kpi-card:hover {
  background: #e0e0e01a;
}
.sideboard {
  border-left: 1px solid #e0e0e0;
  margin-right: 0 !important;
  padding-right: 0 !important;
  right: 0;
}
.sideboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.favorite-item {
  cursor: pointer;
}
.v-slide-group {
  max-height: 44px !important;
}
</style>