<template>
      <v-skeleton-loader
      v-if="isLoading || !currentPersonStore.loaded"
      elevation="12"
      class="fill-height glass-panel"
      type="paragraph"/>
    <template v-else>
      <v-container class=" pa-0" fluid>
        <v-row class="fill-height" no-gutters>
          <v-col cols="12" class="d-flex flex-column">
            <div class="d-flex align-center">
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
              <v-btn-group>
                <v-btn
                  icon="mdi-star-outline"
                  class="transparent"
                  @click="favoritesDrawer = !favoritesDrawer"
                  :title="$t('navigation.favorite')">
                </v-btn>
              </v-btn-group>
            </div>
          </v-col>
        </v-row>
        <VWindow v-model="activeTab">
          <VWindowItem v-for="(tab, idx) in userTabs" :key="tab.id" :value="idx">
            <DashboardKpis
              :userTabs="userTabs"
              :dashboards="dashboards"
              :activeTab="activeTab"/>
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
// #region Imports
import { useSaplingDashboard } from '@/composables/dashboard/useSaplingDashboard';
import DashboardKpis from '@/components/dashboard/SaplingKpis.vue';
import DashboardFavorites from '@/components/dashboard/SaplingFavorites.vue';
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
import '@/assets/styles/SaplingDashboard.css';
import SaplingEdit from '@/components/dialog/SaplingEdit.vue';
// #endregion

// #region Composable
import { ref } from 'vue';
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

const favoritesDrawer = ref(false);
// #endregion
</script>