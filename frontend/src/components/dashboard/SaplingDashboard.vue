<template>
  <v-container class="sapling-dashboard pa-1 pr-8" fluid>
    <section v-if="isLoading" class="sapling-dashboard__hero glass-panel">
      <div class="sapling-dashboard__copy">
        <v-skeleton-loader type="heading, text" />
      </div>

      <div class="sapling-dashboard__actions">
        <v-skeleton-loader v-for="item in 3" :key="item" type="button" class="sapling-dashboard__action" />
      </div>
    </section>
    <SaplingPageHero
      v-else
      class="sapling-dashboard__hero"
      variant="workspace"
      :eyebrow="$t('dashboard.workspace')"
      :title="currentDashboard?.name || $t('dashboard.executiveOverview')"
      :subtitle="$t('dashboard.workspaceSubtitle')"
    >
      <template #side>
        <SaplingDashboardHeroActions
          :has-dashboards="hasDashboards"
          :current-person-loaded="currentPersonStore.loaded"
          @add-kpi="requestAddKpi"
          @open-dashboard="openDashboardDialog"
          @open-favorites="openFavoritesDrawer"
        />
      </template>
    </SaplingPageHero>

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
      <SaplingDashboardTabs
        v-if="hasDashboards"
        v-model:active-tab="activeTab"
        :dashboards="dashboards"
        :add-kpi-request-key="addKpiRequestKey"
        :is-dashboard-removable="isDashboardRemovable"
        @remove-dashboard="removeDashboard"
        @update-kpis="updateDashboardKpis"
      />

      <SaplingDashboardEmptyState
        v-else
        @open-dashboard="openDashboardDialog"
        @open-favorites="openFavoritesDrawer"
      />

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
import SaplingDashboardEmptyState from '@/components/dashboard/SaplingDashboardEmptyState.vue';
import SaplingDashboardHeroActions from '@/components/dashboard/SaplingDashboardHeroActions.vue';
import SaplingDashboardTabs from '@/components/dashboard/SaplingDashboardTabs.vue';
import SaplingFavorites from '@/components/dashboard/SaplingFavorites.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
import SaplingPageHero from '@/components/common/SaplingPageHero.vue';
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