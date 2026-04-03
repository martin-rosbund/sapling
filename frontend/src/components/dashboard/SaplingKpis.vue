<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div>
      <v-row class="pa-2" density="compact">
        <v-col
          v-for="(kpi, kpiIdx) in dashboard.kpis || []"
          :key="kpi.handle"
          cols="12" sm="6" md="6" lg="4" xl="3"
        >
          <SaplingKpiCard
            :kpi="kpi"
            :kpiIdx="kpiIdx"
            :onDelete="() => kpi.handle != null ? openKpiDeleteDialog(kpi.handle) : undefined"
          />
        </v-col>

        <v-col cols="12" sm="6" md="6" lg="4" xl="3">
          <SaplingKpiAddCard @open="openAddKpiDialog" />
        </v-col>
      </v-row>
    </div>

    <SaplingDialogKpi
      :addKpiDialog="addKpiDialog"
      v-model:selectedKpi="selectedKpi"
      :availableKpis="availableKpis"
      :validateAndAddKpi="validateAndAddKpi"
      :closeDialog="closeAddKpiDialog"
      :kpiFormRef="kpiFormRef"
    />
      
    <SaplingDialogDelete
      v-model:modelValue="kpiDeleteDialog"
      :item="kpiToDelete"
      @confirm="confirmKpiDelete"
      @cancel="cancelKpiDelete"
    />
  </div>
</template>

<script setup lang="ts">
// #region Imports
import type { DashboardItem } from '@/entity/entity';
import SaplingKpiCard from '@/components/kpi/SaplingKpiCard.vue';
import SaplingKpiAddCard from '@/components/kpi/SaplingKpiAddCard.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import { useSaplingKpis } from '@/composables/dashboard/useSaplingKpis';
import SaplingDialogKpi from '@/components/dialog/SaplingDialogKpi.vue';
// #endregion

// #region Props
const props = defineProps<{
  dashboard: DashboardItem;
}>();
// #endregion

// #region Composable
const {
  kpiFormRef,
  kpiDeleteDialog,
  kpiToDelete,
  addKpiDialog,
  selectedKpi,
  availableKpis,
  validateAndAddKpi,
  closeAddKpiDialog,
  openKpiDeleteDialog,
  confirmKpiDelete,
  cancelKpiDelete,
  openAddKpiDialog,
} = useSaplingKpis(props.dashboard);
// #endregion

</script>

<style scoped src="@/assets/styles/SaplingKpis.css"></style>
