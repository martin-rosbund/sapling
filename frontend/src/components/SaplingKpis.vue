<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div v-if="userTabs && userTabs.length && typeof activeTab === 'number' && userTabs[activeTab]">
      <v-row class="pa-4" dense>
        <v-col
          v-for="(kpi, kpiIdx) in userTabs[activeTab]?.kpis"
          :key="kpi.handle || kpiIdx"
          cols="12" sm="12" md="6" lg="4"
        >
          <v-card outlined class="sapling-kpi-card glass-panel tilt-content" v-tilt="{ max: 5, scale: 1.05 }" style="min-height: 240px;">
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
                <div v-else class="sapling-kpi-unknown-type text-caption">Unbekannter KPI-Typ</div>
              </template>
            </v-card-text>
          </v-card>
        </v-col>
        <!-- Add KPI Button -->
        <v-col cols="12" sm="12" md="6" lg="4">
          <v-card outlined class="sapling-add-kpi-card d-flex align-center justify-center glass-panel tilt-content" v-tilt="{ max: 5, scale: 1.05 }" style="min-height: 240px;" @click="openAddKpiDialog(activeTab)">
            <v-icon size="large" color="primary">mdi-plus-circle</v-icon>
            <v-btn color="primary" variant="text" class="ma-2">
            {{ $t('global.add') }}
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { KPIItem } from '../entity/entity';
import KpiItem from './kpi/KpiItem.vue';
import KpiList from './kpi/KpiList.vue';
import KpiSparkline from './kpi/KpiSparkline.vue';
import KpiTrend from './kpi/KpiTrend.vue';
import '@/assets/styles/SaplingKpis.css';
import { useSaplingKpis } from '../composables/useSaplingKpis';
import { inject } from 'vue';

const props = defineProps<{
  userTabs: any[];
  activeTab: number;
  openKpiDeleteDialog: (tabIdx: number, kpiIdx: number) => void;
  openAddKpiDialog: (tabIdx: number) => void;
  getKpiTableRows: (kpi: KPIItem) => Array<Record<string, any>>;
  getKpiTableColumns: (kpi: KPIItem) => string[];
  getKpiDisplayValue: (kpi: KPIItem) => string;
  getKpiTrendValue: (kpi: KPIItem) => { current: number; previous: number };
  getKpiSparklineData: (kpi: KPIItem) => Array<{ month: number; year: number; value: number }>;
}>();

const {
  userTabs,
  activeTab,
  openKpiDeleteDialog,
  openAddKpiDialog,
  getKpiTableRows,
  getKpiTableColumns,
  getKpiDisplayValue,
  getKpiTrendValue,
  getKpiSparklineData,
} = useSaplingKpis(
  props.userTabs,
  props.activeTab,
  props.openKpiDeleteDialog,
  props.openAddKpiDialog,
  props.getKpiTableRows,
  props.getKpiTableColumns,
  props.getKpiDisplayValue,
  props.getKpiTrendValue,
  props.getKpiSparklineData
);

const kpiLoading = inject('kpiLoading') as Record<string | number, boolean>;
const loadKpiValue = inject('loadKpiValue') as (kpi: KPIItem) => void;
</script>
