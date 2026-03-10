<template>
  <v-menu v-model="menuOpen" max-width="600px" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :placeholder="placeholder"
        :disabled="disabled"
        :rules="rules"
        :required="required"
        :model-value="search"
        @update:model-value="onSearchInput"
        clearable
        hide-details="auto"
        autocomplete="off"
      />
    </template>
    <div style="min-width: 400px; max-height: 400px; overflow: auto;" class="glass-panel">
      <sapling-table
        :entity-name="entityName"
        :items="items"
        :search="search"
        :page="page"
        :items-per-page="itemsPerPage"
        :total-items="totalItems"
        :is-loading="isLoading"
        :sort-by="sortBy"
        :entity-templates="entityTemplates"
        :entity="entity"
        :entity-permission="entityPermission"
        :show-actions="false"
        :multi-select="false"
        :table-key="entityName"
        :selected="selectedItem ? [selectedItem] : []"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
        @update:search="onSearchUpdate"
        @reload="loadData"
        @update:selected="onTableSelect"
      />
    </div>
  </v-menu>
</template>

<script lang="ts" setup>
import SaplingTable from '@/components/table/SaplingTable.vue';
import type { SaplingGenericItem } from '@/entity/entity';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
import { ref, watch } from 'vue';
import type { EntityTemplate } from '@/entity/structure';

const props = defineProps<{
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem | null | undefined,
  modelName?: string | null | undefined,
  rules?: Array<(v: unknown) => true | string>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  entityTemplates?: EntityTemplate[];
}>();
const emit = defineEmits(['update:modelValue', 'select-record']);

const menuOpen = ref(false);
const search = ref(props.modelValue ? props.modelValue[props.modelName ?? ''] : '');
const selectedItem = ref<SaplingGenericItem | null>(props.modelValue ?? null);

const {
  items,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  entityTemplates,
  entity,
  entityPermission,
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate,
} = useSaplingTable(ref(props.entityName), 10);

function onTableSelect(newSelected: SaplingGenericItem[]) {
  selectedItem.value = newSelected[0] ?? null;
  if (newSelected[0]) {
    search.value = newSelected[0][props.modelName ?? ''];
    menuOpen.value = false;
    emit('update:modelValue', newSelected[0]);
    emit('select-record', newSelected[0]);
  }
}

function onSearchInput(val: string) {
  search.value = val;
  onSearchUpdate(val);
}

watch(() => props.modelValue, (val) => {
  selectedItem.value = val ?? null;
  search.value = val ? val[props.modelName ?? ''] : '';
});
</script>
