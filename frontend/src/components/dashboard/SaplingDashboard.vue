<template>
  <v-container class="sapling-dashboard pa-1 pr-8" fluid>
    <section class="sapling-dashboard__hero glass-panel">
      <template v-if="isLoading">
        <div class="sapling-dashboard__copy">
          <v-skeleton-loader type="heading, text" />
        </div>

        <div class="sapling-dashboard__actions">
          <v-skeleton-loader v-for="item in 3" :key="item" type="button" class="sapling-dashboard__action" />
        </div>
      </template>
      <template v-else>
        <div class="sapling-dashboard__copy">
          <p class="sapling-dashboard__eyebrow">{{ $t('dashboard.workspace') }}</p>
          <h1 class="sapling-dashboard__title">
            {{ currentDashboard?.name || $t('dashboard.executiveOverview') }}
          </h1>
          <p class="sapling-dashboard__subtitle">
            {{ $t('dashboard.workspaceSubtitle') }}
          </p>
        </div>

        <div class="sapling-dashboard__actions">
          <v-btn
            color="primary"
            variant="plain"
            prepend-icon="mdi-chart-box-plus-outline"
            class="sapling-dashboard__action"
            :disabled="!hasDashboards || !currentPersonStore.loaded"
            @click="requestAddKpi"
          >
            {{ $t('kpi.addKpi') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="plain"
            prepend-icon="mdi-plus-circle-outline"
            class="sapling-dashboard__action"
            :disabled="!currentPersonStore.loaded"
            @click="openDashboardDialog"
          >
            {{ $t('dashboard.addDashboard') }}
          </v-btn>
          <v-btn
            variant="plain"
            prepend-icon="mdi-bookmark-multiple-outline"
            class="sapling-dashboard__action"
            @click="openFavoritesDrawer"
          >
            {{ $t('navigation.favorite') }}
          </v-btn>
        </div>
      </template>
    </section>

    <template v-if="isLoading || !currentPersonStore.loaded">
      <section class="sapling-dashboard__surface">
        <div class="sapling-dashboard__tabs-shell glass-panel">
          <v-skeleton-loader type="heading" />
        </div>

        <div class="sapling-dashboard__loading glass-panel">
          <v-skeleton-loader class="sapling-dashboard__loading-bone" type="article, article, article" />
        </div>
      </section>
    </template>
    <template v-else>
      <section v-if="hasDashboards" class="sapling-dashboard__surface">
        <div class="sapling-dashboard__tabs-shell glass-panel">
          <v-tabs
            v-model="activeTab"
            class="sapling-dashboard__tabs"
            height="52"
            show-arrows
          >
            <v-tab
              v-for="(dashboard, dashboardIndex) in dashboards"
              :key="String(dashboard.handle ?? dashboardIndex)"
              :value="dashboardIndex"
              class="sapling-dashboard__tab"
            >
              <div class="sapling-dashboard__tab-content">
                <div class="sapling-dashboard__tab-copy">
                  <span class="sapling-dashboard__tab-title">{{ dashboard.name }}</span>
                  <span class="sapling-dashboard__tab-meta">{{ dashboard.kpis?.length ?? 0 }} {{ $t('dashboard.kpis') }}</span>
                </div>
                <v-btn
                  v-if="isDashboardRemovable && dashboard.handle != null"
                  icon
                  variant="text"
                  size="x-small"
                  class="sapling-dashboard__tab-remove"
                  @click.stop="removeDashboard(dashboard.handle)"
                >
                  <v-icon size="x-small">mdi-close</v-icon>
                </v-btn>
              </div>
            </v-tab>
          </v-tabs>
        </div>

        <div class="sapling-dashboard__window">
          <v-window v-model="activeTab">
            <v-window-item
              v-for="(dashboard, dashboardIndex) in dashboards"
              :key="String(dashboard.handle ?? dashboardIndex)"
              :value="dashboardIndex"
            >
              <SaplingDashboardKpis
                :dashboard="dashboard"
                :open-add-request="dashboardIndex === activeTab ? addKpiRequestKey : 0"
                @update:kpis="updateDashboardKpis(dashboard.handle, $event)"
              />
            </v-window-item>
          </v-window>
        </div>
      </section>

      <section v-else class="sapling-dashboard__empty glass-panel">
        <v-icon size="56" color="primary">mdi-view-dashboard-edit-outline</v-icon>
        <h2 class="sapling-dashboard__empty-title">{{ $t('dashboard.emptyTitle') }}</h2>
        <p class="sapling-dashboard__empty-text">
          {{ $t('dashboard.emptyText') }}
        </p>
        <div class="sapling-dashboard__empty-actions">
          <v-btn color="primary" prepend-icon="mdi-plus-circle-outline" @click="openDashboardDialog">
            {{ $t('global.add') }}
          </v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-bookmark-multiple-outline" @click="openFavoritesDrawer">
            {{ $t('navigation.favorite') }}
          </v-btn>
        </div>
      </section>

      <SaplingDialogEdit
        :model-value="dashboardDialog.visible"
        :mode="dashboardDialog.mode"
        :item="dashboardDialog.item"
        :templates="dashboardTemplates"
        :entity="dashboardEntity"
        @update:model-value="updateDashboardDialogVisibility"
        @update:mode="updateDashboardDialogMode"
        @update:item="updateDashboardDialogItem"
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
    </template>
  </v-container>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingDashboard } from '@/composables/dashboard/useSaplingDashboard';
import SaplingDashboardKpis from '@/components/dashboard/SaplingKpis.vue';
import SaplingFavorites from '@/components/dashboard/SaplingFavorites.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
import { ref } from 'vue';
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
  currentDashboard,
  hasDashboards,
  isDashboardRemovable,
  cancelDashboardDelete,
  closeDashboardDialog,
  openDashboardDialog,
  updateDashboardDialogVisibility,
  updateDashboardDialogMode,
  updateDashboardDialogItem,
  openFavoritesDrawer,
  confirmDashboardDelete,
  onDashboardSave,
  removeDashboard,
  updateDashboardKpis,
} = useSaplingDashboard();

const addKpiRequestKey = ref(0);

function requestAddKpi() {
  if (!hasDashboards.value) {
    return;
  }

  addKpiRequestKey.value += 1;
}
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingDashboard.css"></style>