<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div v-if="userTabs && userTabs.length && typeof activeTab === 'number' && userTabs[activeTab]">
      <v-row class="pl-2 sapling-kpi-grid" dense>
        <v-col
          v-for="(kpi, kpiIdx) in userTabs[activeTab]?.kpis"
          :key="kpi.handle || kpiIdx"
          cols="12" sm="6" md="6" lg="4" xl="4"
        >
          <v-card outlined class="sapling-kpi-card glass-panel tilt-content" v-tilt="{ max: 5, scale: 1.02 }" style="min-height: 240px;">
            <v-card-title class="sapling-kpi-card-title d-flex align-center justify-space-between">
              <span>{{ kpi.name }}</span>
              <v-btn-group>
                <v-btn icon size="x-small" @click.stop="loadKpiValue(kpi)" class="glass-panel">
                  <v-icon>mdi-refresh</v-icon>
                </v-btn>
                <v-btn icon size="x-small" @click.stop="openKpiDeleteDialog(activeTab, kpiIdx)" class="glass-panel">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-btn-group>
            </v-card-title>
            <v-card-text class="sapling-kpi-card-text">
              <div class="sapling-kpi-description text-caption">{{ kpi.description }}</div>
              <template v-if="kpi.handle != null && kpiLoading[kpi.handle]">
                <v-skeleton-loader 
                  type="article" 
                  class="sapling-kpi-skeleton transparent" 
                  style="min-height: 160px;" />
              </template>
              <template v-else>
                <KpiList v-if="kpi.type === 'LIST'" :rows="getKpiTableRows(kpi)" :columns="getKpiTableColumns(kpi)" />
                <KpiItem v-else-if="kpi.type === 'ITEM'" :value="getKpiDisplayValue(kpi)" />
                <KpiTrend v-else-if="kpi.type === 'TREND'" :value="getKpiTrendValue(kpi)" />
                <KpiSparkline v-else-if="kpi.type === 'SPARKLINE'" :data="getKpiSparklineData(kpi)" />
              </template>
            </v-card-text>
          </v-card>
        </v-col>
        <!-- Add KPI Button -->
        <v-col cols="12" sm="6" md="6" lg="4" xl="4">
          <v-card outlined class="sapling-add-kpi-card d-flex align-center justify-center glass-panel tilt-content" v-tilt="{ max: 5, scale: 1.05 }" style="min-height: 240px;" @click="openAddKpiDialog(activeTab)">
            <v-icon size="large" color="primary">mdi-plus-circle</v-icon>
            <v-btn color="primary" variant="text" class="ma-2">
            {{ $t('global.add') }}
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

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
      v-model:modelValue="kpiDeleteDialog"
      :item="kpiToDelete"
      @confirm="confirmKpiDelete"
      @cancel="cancelKpiDelete"
    />
  </div>
</template>
<script setup lang="ts">
import type { DashboardItem } from '../entity/entity';
import KpiItem from './kpi/KpiItem.vue';
import KpiList from './kpi/KpiList.vue';
import KpiSparkline from './kpi/KpiSparkline.vue';
import KpiTrend from './kpi/KpiTrend.vue';
import SaplingDelete from './dialog/SaplingDelete.vue';
import '@/assets/styles/SaplingKpis.css';
import { useSaplingKpis } from '../composables/useSaplingKpis';

import type { DashboardTab } from '../composables/useSaplingKpis';
const props = defineProps<{
  userTabs: DashboardTab[];
  dashboards: DashboardItem[];
  activeTab: number;
}>();

const {
  kpiFormRef,
  kpiDeleteDialog,
  kpiToDelete,
  addKpiDialog,
  selectedKpi,
  availableKpis,
  kpiLoading,
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
} = useSaplingKpis(props.userTabs, props.dashboards);
</script>
