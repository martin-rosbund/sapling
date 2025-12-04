<template>
  <!-- Dropdown menu for selecting a reference entity from a table -->
  <v-menu v-model="menu" max-width="600px" persistent :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :model-value="selectedLabel"
        :rules="rules"
        readonly
        append-inner-icon="mdi-chevron-down"
      />
    </template>
        <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto glass-panel"
        elevation="12"
        type="article, actions"/>
    <template v-else>
      <v-card class="glass-panel">
          <!-- Search input for filtering reference data -->
        <v-text-field
          v-model="search"
          :label="$t('global.search')"
          @input="onSearch"
          clearable
          class="mb-2"
          @mousedown.stop
          @focus.stop
        />
          <!-- Table of reference items -->
        <v-table style="overflow-y: auto; max-height: 600px;" class="glass-table" @scroll.passive="onScroll">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key">{{ $t(`${props.template.referenceName}.${col.name}`) }}</th>
            </tr>
          </thead>
          <tbody>
            <sapling-table-row
              v-for="(item, idx) in items"
              :key="idx"
              :item="item as Record<string, unknown>"
              :columns="columns as EntityTemplate[]"
              :index="idx"
              :selected-row="isSelected(item as Record<string, unknown>) ? idx : null"
              :entity="null"
              :entity-name="props.template.referenceName ?? ''"
              :entity-templates="[props.template]"
              @select-row="selectRow(idx)"
              :entity-permission="entityPermission || null"
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
           <v-btn text color="error" @click="clearSelection" v-if="selected">{{ $t('global.remove') }}</v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-menu>
</template>

<script lang="ts" setup>

// #region Imports
import { ref, watch, computed, onMounted } from 'vue';
import type { EntityTemplate } from '@/entity/structure';
import { useGenericStore } from '@/stores/genericStore';
import SaplingTableRow from '../table/SaplingTableRow.vue';
import { formatValue } from '../../utils/saplingFormatUtil';
// #endregion


// #region Props and Emits
/**
 * Props for SaplingTableRowDropdown component.
 */
const props = defineProps<{
  label: string,
  columns: EntityTemplate[],
  fetchReferenceData: (params: { search: string, page: number, pageSize: number }) => Promise<{ items: Record<string, unknown>[], total: number }>,
  modelValue: Record<string, unknown> | null,
  template: EntityTemplate;
  placeholder?: string;
  rules?: Array<(v: unknown) => true | string>;
}>();
const emit = defineEmits(['update:modelValue']);
// #endregion


// #region State
/**
 * State variables for dropdown, search, pagination, and selection.
 */
const menu = ref(false); // Dropdown open/close state
const search = ref(''); // Search input state
const items = ref<unknown[]>([]); // List of reference items
const page = ref(1); // Pagination state
const pageSize = 20;
const total = ref(0); // Total items
const loading = ref(false); // Loading state for data
const selected = ref<Record<string, unknown> | null>(props.modelValue); // Currently selected item

const genericStore = useGenericStore();
genericStore.loadGeneric(props.template.referenceName ?? '', 'global');
const entityPermission = computed(() => genericStore.getState(props.template.referenceName ?? '').entityPermission);
const isLoading = computed(() => genericStore.getState(props.template.referenceName ?? '').isLoading);
// #endregion


// #region Computed
/**
 * Computed label for the selected item (concatenates first columns).
 */
  const selectedLabel = computed(() => {
  if (!selected.value || !props.template?.referencedPks) return;
    return props.columns.filter(x => x.options?.includes('isShowInCompact'))
      .map(x => formatValue(String(selected.value?.[x.key] ?? ''), x.type))
      .join(' | ');
  });
// #endregion

// #region Methods
/**
 * Loads reference data for the dropdown table (with optional reset).
 */
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

/**
 * Handles search input and triggers data reload.
 */
function onSearch() {
  loadData(true);
}

/**
 * Handles infinite scroll for loading more data.
 */
function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && items.value.length < total.value) {
    page.value += 1;
    loadData();
  }
}

/**
 * Handles row selection via SaplingTableRow.
 */
function selectRow(idx: number) {
  const item = items.value[idx];
  selected.value = item as Record<string, unknown>;
  emit('update:modelValue', item);
  menu.value = false;
}

/**
 * Clears the current selection and emits null.
 */
function clearSelection() {
  selected.value = null;
  emit('update:modelValue', null);
  menu.value = false;
}

/**
 * Checks if the given item is currently selected.
 */
function isSelected(item: Record<string, unknown>) {
  if (!selected.value || !props.template?.referencedPks) return false;
  return (props.template.referencedPks).every((x) => {
    return (selected.value as Record<string, unknown>)[x] === item[x];
  });
}
// #endregion


// #region Lifecycle
// Watch for changes to modelValue and update selected item
watch(() => props.modelValue, val => {
  selected.value = val;
});

onMounted(() => {
  if(!isLoading.value) {
    loadData();
  }
});
// Watch for loading state and load data when ready
watch(
  () => isLoading.value,
  () => {
    if(isLoading.value) return;
    loadData();
  }
);
// #endregion
</script>