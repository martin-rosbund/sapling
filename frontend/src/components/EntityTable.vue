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
    <v-data-table-server
      :headers="headers"
      :items="items"
      :page="page"
      :items-per-page="itemsPerPage"
      :items-length="totalItems"
      :loading="isLoading"
      :server-items-length="totalItems"
      :footer-props="{ itemsPerPageOptions: [10, 25, 50, 100] }"
      @update:page="onPageUpdate"
      @update:items-per-page="onItemsPerPageUpdate"
    >
      <template #item="{ item, columns }">
        <tr>
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
  </v-card>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

type EntityTableHeader = {
  key: string;
  title: string;
  type?: string;
  [key: string]: any;
};

const props = defineProps<{
  headers: EntityTableHeader[],
  items: any[],
  search: string,
  page: number,
  itemsPerPage: number,
  totalItems: number,
  isLoading: boolean
}>();

const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage'
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

function formatDate(value: string | Date, type?: string): string {
  const date = new Date(value);
  switch (type) {
    case 'datetime':
      return date.toLocaleString();
    default:
      return date.toLocaleDateString();
  }
}
</script>