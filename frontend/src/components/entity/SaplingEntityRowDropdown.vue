<template>
  <!-- Dropdown menu for selecting a reference entity from a table -->
  <v-menu v-model="menu" :close-on-content-click="false" max-width="600px">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :model-value="selectedLabel"
        :rules="rules"
        readonly
        @click="menu = true"
        append-inner-icon="mdi-chevron-down"
      />
    </template>
        <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto"
        elevation="12"
        type="article, actions"/>
    <template v-else>
      <v-card>
          <!-- Search input for filtering reference data -->
        <v-text-field
          v-model="search"
          :label="$t('global.search')"
          @input="onSearch"
          clearable
          class="mb-2"
        />
          <!-- Table of reference items -->
        <v-table height="300px" style="overflow-y: auto;" @scroll.passive="onScroll">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key">{{ $t(`${props.template.referenceName}.${col.name}`) }}</th>
            </tr>
          </thead>
          <tbody>
            <SaplingEntityRow
              v-for="(item, idx) in items"
              :key="getRowKey(item, idx)"
              :item="item as Record<string, unknown>"
              :columns="columns as EntityTemplate[]"
              :index="idx"
              :selected-row="isSelected(item as Record<string, unknown>) ? idx : null"
              :entity="null"
              @select-row="selectRow(idx)"
              :show-actions="false"
            />
            <tr v-if="loading">
              <td :colspan="columns.length" class="text-center">
                <v-progress-circular indeterminate size="24" />
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-card-actions>
          <v-btn text @click="menu = false">{{ $t('global.cancel') }}</v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-menu>
</template>

<script lang="ts" setup>
// #region Imports
import { ref, watch, onMounted, computed } from 'vue';
import TranslationService from '@/services/translation.service';
import type { EntityTemplate } from '@/entity/structure';
import SaplingEntityRow from './SaplingEntityRow.vue';
// #endregion

// #region Props and Emits
const props = defineProps<{
  label: string,
  columns: EntityTemplate[],
  fetchReferenceData: (params: { search: string, page: number, pageSize: number }) => Promise<{ items: Record<string, unknown>[], total: number }>,
  modelValue: Record<string, unknown> | null,
  template: EntityTemplate;
  rules?: Array<(v: unknown) => true | string>;
}>();
const emit = defineEmits(['update:modelValue']);
// #endregion

// #region State
const menu = ref(false); // Dropdown open/close state
const search = ref(''); // Search input state
const items = ref<unknown[]>([]); // List of reference items
const page = ref(1); // Pagination state
const pageSize = 20;
const total = ref(0); // Total items
const loading = ref(false); // Loading state for data
const selected = ref<unknown | null>(props.modelValue); // Currently selected item
const isLoading = ref(true); // Loading state for translations
// #endregion

// #region Computed
// Computed label for the selected item
const selectedLabel = computed(() => {
  if (!selected.value) return '';
  return props.columns.map(col => (selected.value as Record<string, unknown>)[col.key]).join(' | ');
});
// #endregion

// #region Methods
// Helper to get a unique key for each row
function getRowKey(item: unknown, idx: number): string | number {
  const obj = item as Record<string, unknown>;
  if (typeof obj.id === 'string' || typeof obj.id === 'number') return obj.id;
  if (typeof obj.handle === 'string' || typeof obj.handle === 'number') return obj.handle;
  return idx;
}

// Loads reference data for the dropdown table
async function loadData(reset = false) {
  if (loading.value) return;
  loading.value = true;
  if (reset) {
    page.value = 1;
    items.value = [];
  }
  const { items: newItems, total: newTotal } = await props.fetchReferenceData({
    search: search.value,
    page: page.value,
    pageSize
  });
  items.value = reset ? newItems : [...items.value, ...newItems];
  total.value = newTotal;
  loading.value = false;
}

// Load translations for the current entity using the TranslationService
const loadTranslation = async () => {
  const translationService = new TranslationService();
  await translationService.prepare(props.template.referenceName, 'global');
};

// Handles search input
function onSearch() {
  loadData(true);
}

// Handles infinite scroll for loading more data
function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && items.value.length < total.value) {
    page.value += 1;
    loadData();
  }
}

// Handles row selection via SaplingEntityRow
function selectRow(idx: number) {
  const item = items.value[idx];
  selected.value = item;
  emit('update:modelValue', item);
  menu.value = false;
}

// Checks if the given item is currently selected
function isSelected(item: Record<string, unknown>) {
  if (!selected.value || !props.template?.joinColumns) return false;
  return (props.template.joinColumns as string[]).every((joinCol) => {
    const pk = joinCol.split('_').slice(1).join('_');
    return (selected.value as Record<string, unknown>)[pk] === item[pk];
  });
}

// Reload all data: translations, templates, and table data
const reloadAll = async () => {
  await loadTranslation();
  await loadData();
};
// #endregion

// #region Lifecycle
// Watch for changes to modelValue and update selected item
watch(() => props.modelValue, val => {
  selected.value = val;
});

// On mount, load translations and data
onMounted(() => {
  isLoading.value = true;
  reloadAll();
  isLoading.value = false;
});
// #endregion
</script>