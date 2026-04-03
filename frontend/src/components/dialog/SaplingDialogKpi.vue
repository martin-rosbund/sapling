<template>
  <!-- Dialog for assigning an additional KPI to the current dashboard -->
  <v-dialog
    :model-value="addKpiDialog"
    @update:model-value="handleDialogUpdate"
    max-width="500"
    class="sapling-add-kpi-dialog"
  >
    <v-card class="glass-panel">
      <v-card-title>{{ $t('global.add') }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef">
          <v-select
            :model-value="selectedKpi"
            @update:model-value="handleSelectedKpiUpdate"
            :items="availableKpis"
            item-title="name"
            item-value="handle"
            :label="$t('navigation.kpi') + '*'"
            return-object
            :rules="kpiRules"
            required
          />
        </v-form>
      </v-card-text>
      <SaplingActionSave :cancel="handleCancel" :save="handleSave" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import type { KPIItem } from '@/entity/entity';
import { useSaplingDialogKpi } from '@/composables/dialog/useSaplingDialogKpi';
import SaplingActionSave from '../actions/SaplingActionSave.vue';
// #endregion

// #region Props & Emits
const props = defineProps<{
  addKpiDialog: boolean;
  selectedKpi?: KPIItem | null;
  availableKpis: KPIItem[];
  validateAndAddKpi: () => void | Promise<void>;
  closeDialog: () => void;
}>();

const emit = defineEmits<{
  (event: 'update:addKpiDialog', value: boolean): void;
  (event: 'update:selectedKpi', value: KPIItem | null): void;
}>();
// #endregion

// #region Composable
const {
  formRef,
  kpiRules,
  handleDialogUpdate,
  handleSelectedKpiUpdate,
  handleCancel,
  handleSave,
} = useSaplingDialogKpi(emit, {
  closeDialog: props.closeDialog,
  validateAndAddKpi: props.validateAndAddKpi,
});
// #endregion
</script>
