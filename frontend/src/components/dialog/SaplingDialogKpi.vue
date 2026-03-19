<template>
  <v-dialog :model-value="addKpiDialog" @update:model-value="val => $emit('update:addKpiDialog', val)" max-width="500" class="sapling-add-kpi-dialog">
    <v-card class="glass-panel">
      <v-card-title>{{ $t('global.add') }}</v-card-title>
      <v-card-text>
        <v-form :ref="kpiFormRef">
          <v-select
            :model-value="selectedKpi"
            @update:model-value="val => $emit('update:selectedKpi', val)"
            :items="availableKpis"
            item-title="name"
            item-value="handle"
            :label="$t('navigation.kpi') + '*'"
            return-object
            :rules="[v => !!v || $t('navigation.kpi') + ' ' + $t('global.isRequired')]"
            required
          />
        </v-form>
      </v-card-text>
      <sapling-action-save :cancel="closeDialog" :save="validateAndAddKpi" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { KPIItem } from '@/entity/entity';
import SaplingActionSave from '../actions/SaplingActionSave.vue';

  
defineProps<{
  addKpiDialog: boolean;
  selectedKpi?: KPIItem| null | undefined;
  availableKpis: KPIItem[];
  validateAndAddKpi: () => void;
  closeDialog: () => void;
  kpiFormRef: any;
}>();
</script>
