<template>
      <v-skeleton-loader
      v-if="isLoading || !currentPersonStore.loaded"
      elevation="12"
      class="fill-height glass-panel"
      type="paragraph"/>
    <template v-else>
      <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
          <!-- Main Dashboard Area -->
            <v-col cols="12" md="9" class="d-flex flex-column sapling-dashboard-main" style="min-width: 0;">
              <!-- Tabs for user-configurable dashboards -->
              <div class="sapling-dashboard-tabs-wrapper" style="overflow-x: auto; white-space: nowrap; max-width: 100vw;">
                <VTabs
                  v-model="activeTab"
                  background-color="primary"
                  dark
                  height="44"
                  class="sapling-dashboard-tabs"
                  show-arrows
                  style="min-width: 0; width: 100%; max-width: 100vw;"
                >
                  <VTab v-for="(tab, idx) in userTabs" :key="tab.id" style="min-width: 120px;">
                    <div class="d-flex align-center sapling-dashboard-tab">
                      <v-icon class="mr-1" v-if="tab.icon">{{ tab.icon }}</v-icon>
                      <span class="mr-2">{{ tab.title }}</span>
                      <v-btn icon size="x-small" class="ml-2 transparent" @click.stop="removeTab(idx)" v-if="userTabs.length > 1">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </div>
                  </VTab>
                  <VTab @click.stop="openDashboardDialog" class="d-flex align-center sapling-dashboard-tab-add" style="min-width: 80px;">
                    <v-icon>mdi-plus</v-icon>
                  </VTab>
                  <!-- Dashboard Anlage Dialog -->
                  <SaplingEdit
                    v-model="dashboardDialog"
                    :mode="'create'"
                    :item="null"
                    :templates="dashboardTemplates || []"
                    :entity="dashboardEntity"
                    @save="onDashboardSave"
                    @cancel="dashboardDialog = false"
                  />
                </VTabs>
              </div>
            <VWindow v-model="activeTab">
              <VWindowItem v-for="(tab, idx) in userTabs" :key="tab.id" :value="idx">
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
              </VWindowItem>
            </VWindow>
          </v-col>

          <v-col cols="12" md="3" class="sapling-sideboard d-flex flex-column" style="min-width: 0;">
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
          <v-card class="glass-panel">
            <v-card-title>{{ $t('global.add') }}</v-card-title>
            <v-card-text>
              <v-form ref="kpiFormRef">
                <v-select
                  v-model="selectedKpi"
                  :items="availableKpis"
                  item-title="name"
                  item-value="handle"
                  :label="$t('navigation.kpi') + '*'"
                  return-object
                  :menu-props="{ contentClass: 'glass-menu'}"
                  :rules="[v => !!v || $t('navigation.kpi') + ' ' + $t('global.isRequired')]"
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
        <SaplingDelete
          v-model:modelValue="dashboardDeleteDialog"
          :item="dashboardToDelete"
          @confirm="confirmDashboardDelete"
          @cancel="cancelDashboardDelete"
        />

        <SaplingDelete
          v-model:modelValue="kpiDeleteDialog"
          :item="kpiToDelete"
          @confirm="confirmKpiDelete"
          @cancel="cancelKpiDelete"
        />

        <!-- Add Favorite Dialog (Prototyp) -->
        <v-dialog v-model="addFavoriteDialog" max-width="500" class="sapling-add-favorite-dialog">
          <v-card class="glass-panel">
            <v-card-title>{{ $t('global.add') }}</v-card-title>
            <v-card-text>
              <v-form ref="favoriteFormRef">
                <v-text-field
                  v-model="newFavoriteTitle"
                  :label="$t('favorite.title') + '*'"
                  :rules="[v => !!v || $t('favorite.title') + ' ' + $t('global.isRequired')]"
                  required
                />
                <v-select
                  v-model="selectedFavoriteEntity"
                  :menu-props="{ contentClass: 'glass-menu'}"
                  :items="entityOptions"
                  :label="$t('navigation.entity') + '*'"
                  return-object
                  :rules="[v => !!v || $t('navigation.entity') + ' ' + $t('global.isRequired')]"
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
import { useSaplingDashboard } from '@/composables/useSaplingDashboard';
import DashboardKpis from './SaplingKpis.vue';
import DashboardFavorites from './SaplingFavorites.vue';
import SaplingDelete from './dialog/SaplingDelete.vue';
import '@/assets/styles/SaplingDashboard.css';
import { provide } from 'vue';
import SaplingEdit from './dialog/SaplingEdit.vue';
// #endregion

// #region Composable
const {
  kpiFormRef,
  favoriteFormRef,
  dashboardDeleteDialog,
  dashboardToDelete,
  kpiDeleteDialog,
  kpiToDelete,
  dashboardDialog,
  dashboardEntity,
  dashboardTemplates,
  addFavoriteDialog,
  newFavoriteTitle,
  selectedFavoriteEntity,
  entityOptions,
  isLoading,
  favorites,
  userTabs,
  activeTab,
  kpiLoading,
  addKpiDialog,
  selectedKpi,
  availableKpis,
  currentPersonStore,
  cancelDashboardDelete,
  openDashboardDialog,
  confirmDashboardDelete,
  onDashboardSave,
  removeTab,
  validateAndAddFavorite,
  openAddFavoriteDialog,
  removeFavorite,
  goToFavorite,
  validateAndAddKpi,
  openKpiDeleteDialog,
  confirmKpiDelete,
  cancelKpiDelete,
  openAddKpiDialog,
  loadKpiValue,
  getKpiDisplayValue,
  getKpiTableRows,
  getKpiTableColumns,
  getKpiSparklineData,
  getKpiTrendValue,
} = useSaplingDashboard();

provide('kpiLoading', kpiLoading);
provide('loadKpiValue', loadKpiValue);
// #endregion
</script>