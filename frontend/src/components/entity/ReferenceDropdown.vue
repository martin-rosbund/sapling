<template>
  <v-menu v-model="menu" :close-on-content-click="false" max-width="600px">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :model-value="selectedLabel"
        readonly
        @click="menu = true"
        append-inner-icon="mdi-chevron-down"
      />
    </template>
    <v-card>
      <v-text-field
        v-model="search"
        :label="$t('search')"
        @input="onSearch"
        clearable
        class="mb-2"
      />
      <v-table height="300px" style="overflow-y: auto;" @scroll.passive="onScroll">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ $t(col.name) }}</th>
          </tr>
        </thead>
        <tbody>
          <EntityTableRow
            v-for="(item, idx) in items"
            :key="item.id ?? item.handle ?? idx"
            :item="item"
            :columns="columns"
            :index="idx"
            :selected-row="isSelected(item) ? idx : null"
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
        <v-btn text @click="menu = false">{{ $t('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';
import EntityTableRow from './EntityTableRow.vue';

const props = defineProps<{
  label: string,
  columns: { key: string; name: string; type?: string; kind?: string }[],
  fetchReferenceData: (params: { search: string, page: number, pageSize: number }) => Promise<{ items: any[], total: number }>,
  modelValue: any | null,
  template: { joinColumns?: string[] }
}>();
const emit = defineEmits(['update:modelValue']);

const menu = ref(false);
const search = ref('');
const items = ref<any[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const selected = ref<any | null>(props.modelValue);

const selectedLabel = computed(() => {
  if (!selected.value) return '';
  return props.columns.map(col => selected.value[col.key]).join(' | ');
});

/**
 * Loads reference data for the dropdown table.
 * @param reset - Whether to reset pagination and items.
 */
async function load(reset = false) {
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
 * Handles search input.
 */
function onSearch() {
  load(true);
}

/**
 * Handles infinite scroll for loading more data.
 */
function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && items.value.length < total.value) {
    page.value += 1;
    load();
  }
}

/**
 * Handles row selection via EntityTableRow.
 */
function selectRow(idx: number) {
  const item = items.value[idx];
  selected.value = item;
  emit('update:modelValue', item);
  menu.value = false;
}

/**
 * Checks if the given item is currently selected.
 */
function isSelected(item: any) {
  if (!selected.value || !props.template?.joinColumns) return false;
  return props.template.joinColumns.every(joinCol => {
    const pk = joinCol.split('_').slice(1).join('_');
    return selected.value[pk] === item[pk];
  });
}

watch(() => props.modelValue, val => {
  selected.value = val;
});

onMounted(() => {
  load(true);
});
</script>

<style scoped>
.selected-row {
  background-color: #e0e0e01a;
}
</style>