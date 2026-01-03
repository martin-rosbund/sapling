<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div v-if="userTabs && userTabs.length && typeof activeTab === 'number' && userTabs[activeTab]">
      <v-row class="pl-2 sapling-kpi-grid" dense>
        <v-col
          v-for="(kpi, kpiIdx) in userTabs[activeTab]?.kpis"
          :key="kpi.handle || kpiIdx"
          cols="12" sm="6" md="6" lg="4" xl="3"
        >
          <SaplingKpiCard
            :kpi="kpi"
            :kpiIdx="kpiIdx"
            :onDelete="idx => openKpiDeleteDialog(activeTab, idx)"
          />
        </v-col>
        <!-- Add KPI Button als eigene Komponente -->
        <v-col cols="12" sm="6" md="6" lg="4" xl="3">
          <SaplingKpiAddCard @open="openAddKpiDialog(activeTab)" />
        </v-col>
      </v-row>
    </div>

    <!-- Add KPI Dialog -->
    <SaplingKpiAddDialog
      :addKpiDialog="addKpiDialog"
      v-model:selectedKpi="selectedKpi"
      :availableKpis="availableKpis"
      :validateAndAddKpi="addKpiToTab"
      :closeDialog="() => addKpiDialog = false"
      :kpiFormRef="kpiFormRef"
    />
      
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
import SaplingKpiCard from '@/components/kpi/SaplingKpiCard.vue';
import SaplingKpiAddDialog from '@/components/kpi/SaplingKpiAddDialog.vue';
import SaplingKpiAddCard from '@/components/kpi/SaplingKpiAddCard.vue';
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
import '@/assets/styles/SaplingKpis.css';

import { useSaplingKpis, type DashboardTab } from '@/composables/dashboard/useSaplingKpis';

// #region props
const props = defineProps<{
  userTabs: DashboardTab[];
  dashboards: DashboardItem[];
  activeTab: number;
}>();
// #endregion

// #region composable
const {
  kpiFormRef,
  kpiDeleteDialog,
  kpiToDelete,
  addKpiDialog,
  selectedKpi,
  availableKpis,
  openKpiDeleteDialog,
  confirmKpiDelete,
  cancelKpiDelete,
  openAddKpiDialog,
  addKpiToTab,
} = useSaplingKpis(props.userTabs, props.dashboards);
// #endregion

</script>
