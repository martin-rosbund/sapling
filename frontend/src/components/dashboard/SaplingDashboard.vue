<template>
  <v-container class="sapling-page-shell sapling-page-shell--uniform-inset sapling-dashboard" fluid>
    <section v-if="isLoading" class="sapling-dashboard__hero glass-panel">
      <div class="sapling-dashboard__copy">
        <v-skeleton-loader type="heading, text" />
      </div>

      <div class="sapling-dashboard__actions">
        <v-skeleton-loader
          v-for="item in 3"
          :key="item"
          type="button"
          class="sapling-dashboard__action"
        />
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
          :can-open-favorites="hasFavoritesAccess"
          :current-person-loaded="currentPersonStore.loaded"
          @add-kpi="requestAddKpi"
          @open-dashboard="openDashboardDialog"
          @open-template-load="openDashboardTemplateLoadDialog"
          @open-template-save="openDashboardTemplateSaveDialog"
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
          <v-skeleton-loader
            class="sapling-dashboard__loading-bone"
            type="article, article, article"
          />
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
        :can-open-favorites="hasFavoritesAccess"
        @open-dashboard="openDashboardDialog"
        @open-template-load="openDashboardTemplateLoadDialog"
        @open-favorites="openFavoritesDrawer"
      />

      <SaplingDialogEdit
        :model-value="dashboardDialog.visible"
        :mode="dashboardDialog.mode"
        :item="dashboardDialog.item"
        :templates="dashboardEntityTemplates"
        :entity="dashboardEntity"
        @update:model-value="updateDashboardDialogVisibility"
        @update:mode="updateDashboardDialogMode"
        @update:item="updateDashboardDialogItem"
        @save="onDashboardSave"
        @cancel="closeDashboardDialog"
      />

      <SaplingDialogEdit
        :model-value="dashboardTemplateDialog.visible"
        :mode="dashboardTemplateDialog.mode"
        :item="dashboardTemplateDialog.item"
        :templates="dashboardTemplateEntityTemplates"
        :entity="dashboardTemplateEntity"
        :force-dirty="dashboardTemplateDialog.visible && dashboardTemplateDialog.mode === 'create'"
        @update:model-value="updateDashboardTemplateDialogVisibility"
        @update:mode="updateDashboardTemplateDialogMode"
        @update:item="updateDashboardTemplateDialogItem"
        @save="onDashboardTemplateSave"
        @cancel="closeDashboardTemplateDialog"
      />

      <SaplingDashboardTemplateLoadDialog
        :model-value="dashboardTemplateLoadDialog"
        :templates="availableDashboardTemplates"
        :busy="applyingDashboardTemplateHandle !== null"
        :busy-template-handle="applyingDashboardTemplateHandle"
        @update:model-value="updateDashboardTemplateLoadDialogVisibility"
        @select="loadDashboardFromTemplate"
      />

      <SaplingDialogDelete
        v-model:modelValue="dashboardDeleteDialog"
        :item="dashboardToDelete"
        @confirm="confirmDashboardDelete"
        @cancel="cancelDashboardDelete"
      />

      <SaplingFavorites v-if="hasFavoritesAccess" v-model="favoritesDrawer" />
    </template>
  </v-container>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingDashboard } from '@/composables/dashboard/useSaplingDashboard'
import SaplingDashboardEmptyState from '@/components/dashboard/SaplingDashboardEmptyState.vue'
import SaplingDashboardHeroActions from '@/components/dashboard/SaplingDashboardHeroActions.vue'
import SaplingDashboardTemplateLoadDialog from '@/components/dashboard/SaplingDashboardTemplateLoadDialog.vue'
import SaplingDashboardTabs from '@/components/dashboard/SaplingDashboardTabs.vue'
import SaplingFavorites from '@/components/dashboard/SaplingFavorites.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import { ref } from 'vue'
// #endregion

// #region Composable
const {
  dashboardDeleteDialog,
  dashboardToDelete,
  dashboardDialog,
  dashboardTemplateDialog,
  dashboardTemplateLoadDialog,
  applyingDashboardTemplateHandle,
  dashboardEntity,
  dashboardEntityTemplates,
  dashboardTemplateEntity,
  dashboardTemplateEntityTemplates,
  availableDashboardTemplates,
  isLoading,
  dashboards,
  activeTab,
  favoritesDrawer,
  currentPersonStore,
  currentDashboard,
  hasDashboards,
  isDashboardRemovable,
  hasFavoritesAccess,
  cancelDashboardDelete,
  closeDashboardDialog,
  closeDashboardTemplateDialog,
  openDashboardDialog,
  openDashboardTemplateLoadDialog,
  openDashboardTemplateSaveDialog,
  updateDashboardDialogVisibility,
  updateDashboardDialogMode,
  updateDashboardDialogItem,
  updateDashboardTemplateDialogVisibility,
  updateDashboardTemplateDialogMode,
  updateDashboardTemplateDialogItem,
  updateDashboardTemplateLoadDialogVisibility,
  openFavoritesDrawer,
  confirmDashboardDelete,
  loadDashboardFromTemplate,
  onDashboardSave,
  onDashboardTemplateSave,
  removeDashboard,
  updateDashboardKpis,
} = useSaplingDashboard()

const addKpiRequestKey = ref(0)

function requestAddKpi() {
  if (!hasDashboards.value) {
    return
  }

  addKpiRequestKey.value += 1
}
// #endregion
</script>
