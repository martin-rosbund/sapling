<template>
  <SaplingTableFilterText
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
import SaplingTableFilterText from './SaplingTableFilterText.vue';

interface SaplingTableFilterColorProps {
  modelValue: string;
  title: string;
  supportsOperatorSelection: boolean;
  operatorLabel: string;
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>;
  sortIcon: unknown;
}

defineProps<SaplingTableFilterColorProps>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:operator': [value: ColumnFilterOperator];
  sort: [];
}>();
</script>