<template>
      <v-skeleton-loader
      v-if="isLoading || !currentPersonStore.loaded"
      elevation="12"
      class="fill-height glass-panel"
      type="paragraph"/>
    <template v-else>
      <v-container class="pa-0 pr-10" fluid>
        <v-row class="fill-height" no-gutters>
          <v-col cols="12" class="d-flex flex-column">
            <div class="d-flex align-center">
              <VTabs
                v-model="activeTab"
                background-color="primary"
                dark
                height="44"
                show-arrows>
                <VTab v-for="dashboard in dashboards" :key="String(dashboard.handle)" style="min-width: 120px;">
                  <div class="d-flex align-center">
                    <v-icon class="mr-1" v-if="dashboard.icon">{{ dashboard.icon }}</v-icon>
                    <span class="mr-2">{{ dashboard.name }}</span>
                    <v-btn-group>
                      <v-btn icon="mdi-close" size="x-small" class="transparent" @click.stop="removeDashboard(String(dashboard.handle))" v-if="dashboards.length > 1"/>
                    </v-btn-group>
                  </div>
                </VTab>
                <VTab @click.stop="openDashboardDialog" class="d-flex align-center" style="min-width: 80px;">
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
          </v-col>
        </v-row>
        <VWindow v-model="activeTab">
          <VWindowItem v-for="dashboard in dashboards" :key="String(dashboard.handle)" :value="dashboards.findIndex(d => d.handle === dashboard.handle)">
            <DashboardKpis
              :dashboards="dashboards"
              :activeTab="dashboards.findIndex(d => d.handle === dashboard.handle)"/>
          </VWindowItem>
        </VWindow>
        <SaplingDelete
          v-model:modelValue="dashboardDeleteDialog"
          :item="dashboardToDelete"
          @confirm="confirmDashboardDelete"
          @cancel="cancelDashboardDelete"/>
        <DashboardFavorites
          v-model:drawer="favoritesDrawer"
          :onUpdate:drawer="val => favoritesDrawer = val"
        />
      </v-container>
    </template>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSaplingDashboard } from '@/composables/dashboard/useSaplingDashboard';
import DashboardKpis from '@/components/dashboard/SaplingKpis.vue';
import DashboardFavorites from '@/components/dashboard/SaplingFavorites.vue';
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
import SaplingEdit from '@/components/dialog/SaplingEdit.vue';

// Use only the composable for all state and logic
const {
  dashboardDeleteDialog,
  dashboardToDelete,
  dashboardDialog,
  dashboardEntity,
  dashboardTemplates,
  isLoading,
  // userTabs removed
  dashboards,
  activeTab,
  currentPersonStore,
  cancelDashboardDelete,
  openDashboardDialog,
  confirmDashboardDelete,
  onDashboardSave,
  removeDashboard,
} = useSaplingDashboard();

const favoritesDrawer = ref(false);
</script>