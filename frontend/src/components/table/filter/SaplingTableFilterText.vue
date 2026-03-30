<template>
  <v-text-field
    :model-value="modelValue"
    :placeholder="title"
    aria-label="column filter"
    density="compact"
    variant="underlined"
    hide-details
    clearable
    single-line
    class="sapling-table-filter-input"
    @click.stop
    @mousedown.stop
    @keydown.stop
    @update:model-value="val => emit('update:modelValue', typeof val === 'string' ? val : '')"
  >
    <template #prepend-inner>
      <v-menu v-if="supportsOperatorSelection">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="text"
            size="x-small"
            class="sapling-table-filter-operator"
            @click.stop
          >
            {{ operatorLabel }}
          </v-btn>
        </template>
        <v-list density="compact" class="glass-panel">
          <v-list-item
            v-for="option in operatorOptions"
            :key="option.value"
            @click="emit('update:operator', option.value)"
          >
            <v-list-item-title>{{ option.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
    <template #append-inner>
      <v-btn
        icon
        variant="text"
        size="x-small"
        class="sapling-table-filter-sort"
        @click.stop="emit('sort')"
      >
        <v-icon size="small">{{ sortIcon }}</v-icon>
      </v-btn>
    </template>
  </v-text-field>
</template>

<script lang="ts" setup>
import type { ColumnFilterOperator } from '@/entity/structure';

interface SaplingTableFilterTextProps {
  modelValue: string;
  title: string;
  supportsOperatorSelection: boolean;
  operatorLabel: string;
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>;
  sortIcon: unknown;
}

defineProps<SaplingTableFilterTextProps>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:operator': [value: ColumnFilterOperator];
  sort: [];
}>();
</script>

<style scoped>
.sapling-table-filter-input {
  min-width: 120px;
}

.sapling-table-filter-operator {
  min-width: 26px;
  padding: 0 2px;
  font-size: 12px;
}

.sapling-table-filter-sort {
  min-width: 26px;
  width: 26px;
  padding: 0;
}

.sapling-table-filter-input :deep(.v-field__input) {
  font-size: inherit;
}

.sapling-table-filter-input :deep(input::placeholder) {
  font-size: small;
  font-weight: bold;
  text-transform: none;
  opacity: 1;
}
</style>