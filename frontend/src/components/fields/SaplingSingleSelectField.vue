<template>
  <v-menu v-model="menuOpen" max-width="600px" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <v-select
        v-bind="activatorProps"
        :label="props.label"
        :items="items.map(item => getCompactLabel(item, entityTemplates))"
        :rules="props.rules"
        :model-value="selectedItem ? getCompactLabel(selectedItem, entityTemplates) : null"
        readonly
        @click:append-inner="menuOpen = !menuOpen"
        hide-details="auto"
      >
        <template #selection="{ item }">
          <v-chip
            class="ma-1"
            closable
            @click:close="removeChip()"
          >
            {{ getCompactLabel(selectedItem, entityTemplates) }}
          </v-chip>
        </template>
      </v-select>
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
        :show-actions="true"
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
// #region Imports
import SaplingTable from '@/components/table/SaplingTable.vue';
import type { SaplingGenericItem } from '@/entity/entity';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
import { ref, watch } from 'vue';
import { getCompactLabel } from '@/utils/saplingTableUtil';
import { useSaplingSingleSelectField } from '@/composables/fields/useSaplingSingleSelectField';
// #endregion

// #region Props and Emits
const props = defineProps<{
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem,
  rules?: Array<(v: unknown) => true | string>;
  placeholder?: string;
}>();
const emit = defineEmits(['update:modelValue']);
// #endregion

// #region Selection State
function onTableSelect(newSelected: SaplingGenericItem[]) {
  selectedItem.value = newSelected[0] ?? null;
  
  if (newSelected[0]) {
    menuOpen.value = false;
  }
}

// Entfernt das ausgewählte Item, wenn der Chip geschlossen wird und synchronisiert die Tabelle
function removeChip() {
  selectedItem.value = null;
  // Trigger table selection update
  onTableSelect([]);
}
// #endregion

// #region Composable
const {
  items,
  search,
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
} = useSaplingTable(ref(props.entityName));

const {
  selectedItem,
  menuOpen,
} = useSaplingSingleSelectField(props);
// #endregion

watch(selectedItem, (val) => {
  emit('update:modelValue', val);
});
</script>
