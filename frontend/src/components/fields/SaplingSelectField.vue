<template>
  <v-menu v-model="menuOpen" max-width="600px" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <v-select
        v-bind="activatorProps"
        :label="props.label"
        :items="selectedItems.map(item => getCompactLabel(item, entityTemplates))"
        :rules="props.rules"
        :model-value="selectedItems.map(item => getCompactLabel(item, entityTemplates))"
        multiple
        chips
        readonly
        @click:append-inner="menuOpen = !menuOpen"
        hide-details="auto"
      >
        <template #chip="{ item, index }">
          <v-chip
            class="ma-1"
            closable
            size="large"
            @click:close="removeChip(index)"
          >
            {{ getCompactLabel(selectedItems[index], entityTemplates) }}
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
        :show-actions="false"
        :multi-select="true"
        :table-key="entityName"
        :selected="selectedItems"
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
import { useSaplingSelectField } from '@/composables/fields/useSaplingSelectField';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import ApiGenericService from '@/services/api.generic.service';

// #region Props and Emits
const props = defineProps<{
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem[],
  rules?: Array<(v: unknown) => true | string>;
  placeholder?: string;
}>();
const emit = defineEmits(['update:modelValue']);
// #endregion

// #region Selection State
function onTableSelect(newSelected: SaplingGenericItem[]) {
  selectedItems.value = newSelected;
}

// Entfernt ein Item aus den Chips und aktualisiert die Auswahl
function removeChip(index: number) {
  const updated = [...selectedItems.value];
  updated.splice(index, 1);
  selectedItems.value = updated;
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
} = useSaplingTable(ref(props.entityName), DEFAULT_PAGE_SIZE_SMALL);

const {
  selectedItems,
  menuOpen,
} = useSaplingSelectField(props);
// #endregion

// #region Load default item if placeholder is set
import { onMounted, nextTick } from 'vue';

watch(
  () => [entityTemplates, isLoading],
  async ([templates, loading]) => {
    if (!loading && templates && props.placeholder && selectedItems.value.length === 0) {
      // Find primary key field name from templates
      const primaryKeyField = Array.isArray(templates)
        ? templates.find((t: any) => t.isPrimaryKey)?.name
        : undefined;
      if (primaryKeyField) {
        try {
          const response = await ApiGenericService.find(props.entityName, {
            filter: { [primaryKeyField]: props.placeholder },
            limit: 1,
          });
          if (response.data && response.data.length > 0) {
            selectedItems.value = [response.data[0] as SaplingGenericItem];
          }
        } catch (e) {
          // Optionally handle error
        }
      }
    }
  },
  { immediate: true }
);
// #endregion

watch(selectedItems, (val) => {
  emit('update:modelValue', val);
});

</script>