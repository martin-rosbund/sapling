<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div v-if="dashboards && dashboards.length && typeof activeDashboard === 'object' && activeDashboard">
      <v-row class="pl-2 pr-4" dense>
        <v-col
          v-for="(kpi, kpiIdx) in activeDashboard.kpis"
          :key="kpi.handle"
          cols="12" sm="6" md="6" lg="4" xl="3"
        >
          <SaplingKpiCard
            :kpi="kpi"
            :kpiIdx="kpiIdx"
            :onDelete="() => activeDashboard && activeDashboard.handle != null ? openKpiDeleteDialog(activeDashboard.handle, kpi.handle) : undefined"
          />
        </v-col>
        <!-- Add KPI Button als eigene Komponente -->
        <v-col cols="12" sm="6" md="6" lg="4" xl="3">
          <SaplingKpiAddCard @open="activeDashboard && activeDashboard.handle != null ? openAddKpiDialog(activeDashboard.handle) : undefined" />
        </v-col>
      </v-row>
    </div>

    <!-- Add KPI Dialog -->
    <SaplingKpiAddDialog
      :addKpiDialog="addKpiDialog"
      v-model:selectedKpi="selectedKpi"
      :availableKpis="availableKpis"
      :validateAndAddKpi="addKpiToDashboard"
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

import { useSaplingKpis } from '@/composables/dashboard/useSaplingKpis';
import { computed } from 'vue';

// #region props
const props = defineProps<{
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
  addKpiToDashboard,
} = useSaplingKpis(props.dashboards);

const activeDashboard = computed(() => {
  return props.dashboards?.find(d => d.handle === props.dashboards[props.activeTab]?.handle) || null;
});
// #endregion

</script>
