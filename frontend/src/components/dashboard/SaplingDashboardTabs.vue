<template>
  <section class="sapling-dashboard__surface">
    <div class="sapling-dashboard__tabs-shell glass-panel">
      <v-tabs v-model="activeTabModel" class="sapling-dashboard__tabs" height="52" show-arrows>
        <v-tab
          v-for="(dashboard, dashboardIndex) in dashboards"
          :key="String(dashboard.handle ?? dashboardIndex)"
          :value="dashboardIndex"
          class="sapling-dashboard__tab"
        >
          <div class="sapling-dashboard__tab-content">
            <div class="sapling-dashboard__tab-copy">
              <span class="sapling-dashboard__tab-title">{{ dashboard.name }}</span>
              <span class="sapling-dashboard__tab-meta"
                >{{ dashboard.kpis?.length ?? 0 }} {{ $t('dashboard.kpis') }}</span
              >
            </div>
            <v-btn
              v-if="isDashboardRemovable && dashboard.handle != null"
              icon
              variant="text"
              size="x-small"
              class="sapling-dashboard__tab-remove"
              @click.stop="emit('removeDashboard', dashboard.handle)"
            >
              <v-icon size="x-small">mdi-close</v-icon>
            </v-btn>
          </div>
        </v-tab>
      </v-tabs>
    </div>

    <div class="sapling-dashboard__window">
      <v-window v-model="activeTabModel">
        <v-window-item
          v-for="(dashboard, dashboardIndex) in dashboards"
          :key="String(dashboard.handle ?? dashboardIndex)"
          :value="dashboardIndex"
        >
          <SaplingDashboardKpis
            :dashboard="dashboard"
            :open-add-request="dashboardIndex === activeTab ? addKpiRequestKey : 0"
            @update:kpis="emit('updateKpis', dashboard.handle, $event)"
          />
        </v-window-item>
      </v-window>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardItem } from '@/entity/entity'
import SaplingDashboardKpis from '@/components/dashboard/SaplingKpis.vue'

const props = defineProps<{
  dashboards: DashboardItem[]
  activeTab: number
  addKpiRequestKey: number
  isDashboardRemovable: boolean
}>()

const emit = defineEmits<{
  (event: 'update:activeTab', value: number): void
  (event: 'removeDashboard', handle: NonNullable<DashboardItem['handle']>): void
  (event: 'updateKpis', dashboardHandle: DashboardItem['handle'], kpis: DashboardItem['kpis']): void
}>()

const activeTabModel = computed({
  get: () => props.activeTab,
  set: (value: number) => emit('update:activeTab', value),
})
</script>

<style scoped src="@/assets/styles/SaplingDashboard.css"></style>
