<template>
  <div class="dashboard-kpi-scroll">
  <div v-if="userTabs && userTabs.length && typeof activeTab === 'number' && userTabs[activeTab]">
    <v-row class="pa-4" dense>
      <v-col
        v-for="(kpi, kpiIdx) in userTabs[activeTab].kpis"
        :key="kpi.handle || kpiIdx"
        cols="12" sm="12" md="6" lg="4"
      >
        <v-card outlined class="kpi-card">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>{{ kpi.name }}</span>
            <v-btn icon size="x-small" @click.stop="openKpiDeleteDialog(activeTab, kpiIdx)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div class="text-caption">{{ kpi.description }}</div>
            <KpiList v-if="kpi.type === 'LIST'" :rows="getKpiTableRows(kpi)" :columns="getKpiTableColumns(kpi)" />
            <KpiItem v-else-if="kpi.type === 'ITEM'" :value="getKpiDisplayValue(kpi)" />
            <KpiTrend v-else-if="kpi.type === 'TREND'" :value="getKpiTrendValue(kpi)" />
            <KpiSparkline v-else-if="kpi.type === 'SPARKLINE'" :data="getKpiSparklineData(kpi)" />
            <div v-else class="text-caption">Unbekannter KPI-Typ</div>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Add KPI Button -->
      <v-col cols="12" sm="12" md="6" lg="4">
        <v-card outlined class="add-kpi-card d-flex align-center justify-center" @click="openAddKpiDialog(activeTab)">
          <v-icon size="large">mdi-plus-circle</v-icon>
          <span class="ml-2">KPI hinzufügen</span>
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
import KpiTrend from './kpi/KpiTrend.vue';
import KpiSparkline from './kpi/KpiSparkline.vue';

interface DashboardTab {
  id: number;
  title: string;
  icon?: string;
  kpis: KPIItem[];
}

defineProps<{
  userTabs: DashboardTab[];
  activeTab: number;
  openKpiDeleteDialog: (tabIdx: number, kpiIdx: number) => void;
  openAddKpiDialog: (tabIdx: number) => void;
  getKpiTableRows: (kpi: KPIItem) => Array<Record<string, any>>;
  getKpiTableColumns: (kpi: KPIItem) => string[];
  getKpiDisplayValue: (kpi: KPIItem) => string;
  getKpiTrendValue: (kpi: KPIItem) => { current: number; previous: number };
  getKpiSparklineData: (kpi: KPIItem) => Array<{ month: number; year: number; value: number }>;
}>();
</script>
