<template>
  <v-card flat style="height: 100%;">
    <template v-slot:text>
      <v-text-field
        :model-value="localSearch"
        @update:model-value="onSearchUpdate"
        label="Search"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        hide-details
        single-line
      />
    </template>
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"/>
    <template v-else>
      <v-data-table-server
        :height="tableHeight"
        :headers="headers"
        :items="items"
        :page="page"
        :items-per-page="itemsPerPage"
        :items-length="totalItems"
        :loading="isLoading"
        :server-items-length="totalItems"
        :footer-props="{ itemsPerPageOptions: [10, 25, 50, 100] }"
        :sort-by="sortBy"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
      >
        <template #item="{ item, columns, index }">
          <tr
            :class="{ 'selected-row': selectedRow === index }"
            @click="selectRow(index)"
            style="cursor: pointer;"
          >
            <td v-for="col in columns" :key="col.key ?? ''">
              <span v-if="(col as EntityTableHeader).type?.startsWith('date') && col.key && item[col.key]">
                {{ formatDate(item[col.key], (col as EntityTableHeader).type) }}
              </span>
              <span v-else>
                {{ col.key ? item[col.key] : '' }}
              </span>
            </td>
          </tr>
        </template>
      </v-data-table-server>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

type EntityTableHeader = {
  key: string;
  title: string;
  type?: string;
  [key: string]: any;
};

type SortItem = { key: string; order?: 'asc' | 'desc' };

const props = defineProps<{
  headers: EntityTableHeader[],
  items: any[],
  search: string,
  page: number,
  itemsPerPage: number,
  totalItems: number,
  isLoading: boolean,
  sortBy: SortItem[]
}>();

const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage',
  'update:sortBy'
]);

const localSearch = ref(props.search);

watch(() => props.search, (val) => {
  localSearch.value = val;
});

function onSearchUpdate(val: string) {
  localSearch.value = val;
  emit('update:search', val);
}

function onPageUpdate(val: number) {
  emit('update:page', val);
}

function onItemsPerPageUpdate(val: number) {
  emit('update:itemsPerPage', val);
}

function onSortByUpdate(val: SortItem[]) {
  emit('update:sortBy', val);
}

function formatDate(value: string | Date, type?: string): string {
  const date = new Date(value);
  switch (type) {
    case 'datetime':
      return date.toLocaleString();
    default:
      return date.toLocaleDateString();
  }
}

const tableHeight = ref(600);

function updateTableHeight() {
  tableHeight.value = Math.max(window.innerHeight - 280, 300);
}

onMounted(() => {
  updateTableHeight();
  window.addEventListener('resize', updateTableHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableHeight);
});

const selectedRow = ref<number | null>(null);

function selectRow(index: number) {
  selectedRow.value = index;
}
</script>

<style scoped>
.selected-row {
  background-color: #e0e0e01a;
}
</style>