<template>
  <v-skeleton-loader
    v-if="isLoading || !currentPersonStore.loaded"
    elevation="12"
    class="fill-height glass-panel"
    type="paragraph"
  />
  <template v-else>
    <v-container class="pa-0 pr-10" fluid>
      <v-row class="fill-height" density="compact">
        <v-col cols="12" class="d-flex flex-column">
          <div class="d-flex align-center">
            <v-tabs
              v-model="activeTab"
              background-color="primary"
              dark
              height="44"
              show-arrows
            >
              <v-tab
                v-for="(dashboard, dashboardIndex) in dashboards"
                :key="String(dashboard.handle)"
                :value="dashboardIndex"
              >
                <div class="d-flex align-center">
                  <v-icon v-if="dashboard.icon" class="mr-1">{{ dashboard.icon }}</v-icon>
                  <span class="mr-2">{{ dashboard.name }}</span>
                  <v-btn
                    v-if="isDashboardRemovable && dashboard.handle != null"
                    icon
                    variant="text"
                    size="x-small"
                    @click.stop="removeDashboard(dashboard.handle)"
                  >
                    <v-icon size="x-small">mdi-close</v-icon>
                  </v-btn>
                </div>
              </v-tab>

              <v-tab
                class="d-flex align-center"
                style="min-width: 80px;"
                @click.stop="openDashboardDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-tab>
            </v-tabs>
          </div>
        </v-col>
      </v-row>

      <v-window v-model="activeTab">
        <v-window-item
          v-for="(dashboard, dashboardIndex) in dashboards"
          :key="String(dashboard.handle)"
          :value="dashboardIndex"
        >
          <SaplingDashboardKpis :dashboard="dashboard" />
        </v-window-item>
      </v-window>

      <SaplingDialogEdit
        v-model="dashboardDialog"
        :mode="'create'"
        :item="null"
        :templates="dashboardTemplates"
        :entity="dashboardEntity"
        @save="onDashboardSave"
        @cancel="closeDashboardDialog"
      />

      <SaplingDialogDelete
        v-model:modelValue="dashboardDeleteDialog"
        :item="dashboardToDelete"
        @confirm="confirmDashboardDelete"
        @cancel="cancelDashboardDelete"
      />

      <SaplingFavorites v-model="favoritesDrawer" />
    </v-container>
  </template>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingDashboard } from '@/composables/dashboard/useSaplingDashboard';
import SaplingDashboardKpis from '@/components/dashboard/SaplingKpis.vue';
import SaplingFavorites from '@/components/dashboard/SaplingFavorites.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
// #endregion

// #region Composable
const {
  dashboardDeleteDialog,
  dashboardToDelete,
  dashboardDialog,
  dashboardEntity,
  dashboardTemplates,
  isLoading,
  dashboards,
  activeTab,
  favoritesDrawer,
  currentPersonStore,
  isDashboardRemovable,
  cancelDashboardDelete,
  closeDashboardDialog,
  openDashboardDialog,
  confirmDashboardDelete,
  onDashboardSave,
  removeDashboard,
} = useSaplingDashboard();
// #endregion
</script>