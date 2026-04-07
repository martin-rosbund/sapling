<template>
  <div class="sapling-dashboard-kpi-scroll">
    <div class="sapling-kpi-surface">
      <v-row class="sapling-kpi-grid" density="comfortable">
        <template v-if="kpis.length > 0">
          <v-col
            v-for="(kpi, kpiIdx) in kpis"
            :key="kpi.handle"
            cols="12" sm="6" md="6" lg="4" xl="3"
            class="d-flex"
          >
            <SaplingKpiCard
              :kpi="kpi"
              :kpiIdx="kpiIdx"
              :onDelete="() => kpi.handle != null ? openKpiDeleteDialog(kpi.handle) : undefined"
            />
          </v-col>
        </template>

        <v-col
          v-else
          cols="12"
        >
          <div class="sapling-kpi-empty glass-panel">
            <v-icon size="52" color="primary">mdi-chart-box-plus-outline</v-icon>
            <h3 class="sapling-kpi-empty__title">No KPIs on this dashboard yet</h3>
            <p class="sapling-kpi-empty__text">
              Add your first KPI card to turn this dashboard into a focused operational view.
            </p>
            <v-btn color="primary" prepend-icon="mdi-plus-circle-outline" @click="openAddKpiDialog">
              {{ $t('global.add') }}
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </div>

    <SaplingDialogKpi
      :addKpiDialog="addKpiDialog"
      v-model:selectedKpi="selectedKpi"
      :availableKpis="availableKpis"
      :validateAndAddKpi="validateAndAddKpi"
      :closeDialog="closeAddKpiDialog"
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
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import { useSaplingKpis } from '@/composables/dashboard/useSaplingKpis';
import SaplingDialogKpi from '@/components/dialog/SaplingDialogKpi.vue';
import { toRef, watch } from 'vue';
// #endregion

// #region Props
const props = defineProps<{
  dashboard: DashboardItem;
  openAddRequest?: number;
}>();

const emit = defineEmits<{
  (event: 'update:kpis', value: NonNullable<DashboardItem['kpis']>): void;
}>();
// #endregion

// #region Composable
const {
  kpis,
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
} = useSaplingKpis(toRef(props, 'dashboard'), (nextKpis) => emit('update:kpis', nextKpis));

watch(
  () => props.openAddRequest,
  (nextRequest, previousRequest) => {
    if (!nextRequest || nextRequest === previousRequest) {
      return;
    }

    void openAddKpiDialog();
  },
);
// #endregion

</script>

<style scoped src="@/assets/styles/SaplingKpis.css"></style>
