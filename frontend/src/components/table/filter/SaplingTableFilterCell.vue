<template>
  <SaplingTableFilterBoolean
    v-if="filterType === 'boolean'"
    :model-value="modelValue"
    :title="title"
    :sort-icon="sortIcon"
    @toggle="emit('toggle')"
    @sort="emit('sort')"
  />
  <SaplingTableFilterColor
    v-else-if="filterType === 'color'"
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
  <SaplingTableFilterMoney
    v-else-if="filterType === 'money'"
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
  <SaplingTableFilterIcon
    v-else-if="filterType === 'icon'"
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
  <SaplingTableFilterPercent
    v-else-if="filterType === 'percent'"
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
  <SaplingTableFilterPhone
    v-else-if="filterType === 'phone'"
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
  <SaplingTableFilterMail
    v-else-if="filterType === 'mail'"
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
  <SaplingTableFilterLink
    v-else-if="filterType === 'link'"
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
  <SaplingTableFilterDefault
    v-else
    :model-value="modelValue"
    :title="title"
    :is-date="isDate"
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
import { computed } from 'vue';
import type { ColumnFilterOperator } from '@/entity/structure';
import SaplingTableFilterBoolean from './SaplingTableFilterBoolean.vue';
import SaplingTableFilterColor from './SaplingTableFilterColor.vue';
import SaplingTableFilterDefault from './SaplingTableFilterDefault.vue';
import SaplingTableFilterIcon from './SaplingTableFilterIcon.vue';
import SaplingTableFilterLink from './SaplingTableFilterLink.vue';
import SaplingTableFilterMail from './SaplingTableFilterMail.vue';
import SaplingTableFilterMoney from './SaplingTableFilterMoney.vue';
import SaplingTableFilterPercent from './SaplingTableFilterPercent.vue';
import SaplingTableFilterPhone from './SaplingTableFilterPhone.vue';

type TableColumnLike = Record<string, unknown> & { key: string | null };

interface SaplingTableFilterCellProps {
  column: TableColumnLike;
  modelValue: string;
  title: string;
  isDate: boolean;
  supportsOperatorSelection: boolean;
  operatorLabel: string;
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>;
  sortIcon: unknown;
}

const props = defineProps<SaplingTableFilterCellProps>();

const emit = defineEmits<{
  toggle: [];
  'update:modelValue': [value: string];
  'update:operator': [value: ColumnFilterOperator];
  sort: [];
}>();

const filterType = computed(() => {
  const options = Array.isArray(props.column.options)
    ? props.column.options.filter((option): option is string => typeof option === 'string')
    : [];

  if (props.column.type === 'boolean') return 'boolean';
  if (options.includes('isColor')) return 'color';
  if (options.includes('isMoney')) return 'money';
  if (options.includes('isIcon')) return 'icon';
  if (options.includes('isPercent')) return 'percent';
  if (options.includes('isPhone')) return 'phone';
  if (options.includes('isMail')) return 'mail';
  if (options.includes('isLink')) return 'link';
  return 'default';
});
</script>