<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div v-if="userTabs && userTabs.length && typeof activeTab === 'number' && userTabs[activeTab]">
      <v-row class="pl-2 sapling-kpi-grid" dense>
        <v-col
          v-for="(kpi, kpiIdx) in userTabs[activeTab]?.kpis"
          :key="kpi.handle || kpiIdx"
          cols="12" sm="6" md="6" lg="4" xl="4"
        >
          <v-card outlined class="sapling-kpi-card glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" style="min-height: 240px;">
            <v-card-title class="sapling-kpi-card-title d-flex align-center justify-space-between">
              <span>{{ kpi.name }}</span>
              <v-btn-group>
                <v-btn icon size="x-small" @click.stop="refreshKpi(kpiIdx)" class="glass-panel">
                  <v-icon>mdi-refresh</v-icon>
                </v-btn>
                <v-btn icon size="x-small" @click.stop="openKpiDeleteDialog(activeTab, kpiIdx)" class="glass-panel">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-btn-group>
            </v-card-title>
            <v-card-text class="sapling-kpi-card-text">
              <div class="sapling-kpi-description text-caption">{{ kpi.description }}</div>
              <KpiList v-if="kpi.type === 'LIST'" :ref="el => kpiRefs[kpiIdx] = el" :kpi="kpi" />
              <KpiItem v-else-if="kpi.type === 'ITEM'" :ref="el => kpiRefs[kpiIdx] = el" :kpi="kpi" />
              <KpiTrend v-else-if="kpi.type === 'TREND'" :ref="el => kpiRefs[kpiIdx] = el" :kpi="kpi" />
              <KpiSparkline v-else-if="kpi.type === 'SPARKLINE'" :ref="el => kpiRefs[kpiIdx] = el" :kpi="kpi" />
            </v-card-text>
          </v-card>
        </v-col>
        <!-- Add KPI Button -->
        <v-col cols="12" sm="6" md="6" lg="4" xl="4">
          <v-card outlined class="sapling-add-kpi-card d-flex align-center justify-center glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" style="min-height: 240px;" @click="openAddKpiDialog(activeTab)">
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
import type { DashboardItem } from '@/entity/entity';
import KpiItem from '@/components/kpi/KpiItem.vue';
import KpiList from '@/components/kpi/KpiList.vue';
import KpiSparkline from '@/components/kpi/KpiSparkline.vue';
import KpiTrend from '@/components/kpi/KpiTrend.vue';
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
import '@/assets/styles/SaplingKpis.css';
import { useSaplingKpis } from '@/composables/dashboard/useSaplingKpis';

import type { DashboardTab } from '@/composables/dashboard/useSaplingKpis';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
const props = defineProps<{
  userTabs: DashboardTab[];
  dashboards: DashboardItem[];
  activeTab: number;
}>();

const {
  kpiDeleteDialog,
  kpiToDelete,
  addKpiDialog,
  selectedKpi,
  availableKpis,
  kpiLoading,
  kpiValues,
  validateAndAddKpi,
  openKpiDeleteDialog,
  confirmKpiDelete,
  cancelKpiDelete,
  openAddKpiDialog,
  loadKpiValue,
} = useSaplingKpis(props.userTabs, props.dashboards);
import { ref } from 'vue';

// Dynamisches Array für die KPI-Refs
const kpiRefs = ref<any[]>([]);

function refreshKpi(idx: number) {
  const comp = kpiRefs.value[idx];
  if (comp && typeof comp.loadKpiValue === 'function') {
    comp.loadKpiValue();
  }
}
</script>
