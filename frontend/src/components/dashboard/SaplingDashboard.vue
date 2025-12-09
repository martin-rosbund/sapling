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
            <v-col cols="12" md="10" class="d-flex flex-column sapling-dashboard-main" style="min-width: 0;">
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
                      <v-btn-group>
                        <v-btn icon="mdi-close" size="x-small" class="transparent" @click.stop="removeTab(idx)" v-if="userTabs.length > 1"/>
                      </v-btn-group>
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
                  :dashboards="dashboards"
                  :activeTab="activeTab"
                />
              </VWindowItem>
            </VWindow>
          </v-col>

          <v-col cols="12" md="2" class="sapling-sideboard d-flex flex-column" style="min-width: 0;">
            <DashboardFavorites />
          </v-col>
        </v-row>
        <SaplingDelete
          v-model:modelValue="dashboardDeleteDialog"
          :item="dashboardToDelete"
          @confirm="confirmDashboardDelete"
          @cancel="cancelDashboardDelete"/>
      </v-container>
    </template>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingDashboard } from '@/composables/dashboard/useSaplingDashboard';
import DashboardKpis from '@/components/dashboard/SaplingKpis.vue';
import DashboardFavorites from '@/components/dashboard/SaplingFavorites.vue';
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
import '@/assets/styles/SaplingDashboard.css';
import SaplingEdit from '@/components/dialog/SaplingEdit.vue';
// #endregion

// #region Composable
const {
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
} = useSaplingDashboard();

// #endregion
</script>