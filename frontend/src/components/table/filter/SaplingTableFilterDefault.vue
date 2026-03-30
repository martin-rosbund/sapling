<template>
  <SaplingTableFilterInput
    v-if="isDate"
    :model-value="modelValue"
    :title="title"
    :is-date="true"
    :supports-operator-selection="supportsOperatorSelection"
    :operator-label="operatorLabel"
    :operator-options="operatorOptions"
    :sort-icon="sortIcon"
    @update:model-value="emit('update:modelValue', $event)"
    @update:operator="emit('update:operator', $event)"
    @sort="emit('sort')"
  />
  <SaplingTableFilterText
    v-else
    :model-value="modelValue"
    :title="title"
    :supports-operator-selection="supportsOperatorSelection"
    :operator-label="operatorLabel"
    :operator-options="operatorOptions"
    :sort-icon="sortIcon"
    @update:model-value="emit('update:modelValue', $event)"
    @update:operator="emit('update:operator', $event)"
    @sort="emit('sort')"
  />
</template>

<script lang="ts" setup>
import type { ColumnFilterOperator } from '@/entity/structure';
import SaplingTableFilterInput from './SaplingTableFilterInput.vue';
import SaplingTableFilterText from './SaplingTableFilterText.vue';

interface SaplingTableFilterDefaultProps {
  modelValue: string;
  title: string;
  isDate: boolean;
  supportsOperatorSelection: boolean;
  operatorLabel: string;
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>;
  sortIcon: unknown;
}

defineProps<SaplingTableFilterDefaultProps>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:operator': [value: ColumnFilterOperator];
  sort: [];
}>();
</script>