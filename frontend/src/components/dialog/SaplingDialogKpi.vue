<template>
  <!-- Dialog for assigning an additional KPI to the current dashboard -->
  <v-dialog
    :model-value="addKpiDialog"
    @update:model-value="handleDialogUpdate"
    max-width="500"
    class="sapling-add-kpi-dialog"
  >
    <v-card class="glass-panel tilt-content sapling-dialog-compact-card" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <div class="sapling-dialog-shell">
        <SaplingDialogHero
          :eyebrow="$t('global.add')"
          :title="$t('navigation.kpi')"
          :subtitle="selectedKpiName"
        />

        <div class="sapling-dialog-form-body">
          <v-form ref="formRef" class="sapling-dialog-form">
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
        </div>
        <SaplingActionSave :cancel="handleCancel" :save="handleSave" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { computed } from 'vue';
import type { KPIItem } from '@/entity/entity';
import { useSaplingDialogKpi } from '@/composables/dialog/useSaplingDialogKpi';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionSave from '../actions/SaplingActionSave.vue';
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue';
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

const selectedKpiName = computed(() => props.selectedKpi?.name || '');
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
