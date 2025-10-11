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
    <v-data-table
      :headers="headers"
      :items="items"
      :search="localSearch"
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
    </v-data-table>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

type EntityTableHeader = {
  key: string;
  title: string;
  type?: string; // Add type property as optional
  [key: string]: any; // Allow additional properties
};

const props = defineProps<{
  headers: EntityTableHeader[],
  items: any[],
  search: string
}>();

const emit = defineEmits(['update:search']);

const localSearch = ref(props.search);

watch(() => props.search, (val) => {
  localSearch.value = val;
});

function onSearchUpdate(val: string) {
  localSearch.value = val;
  emit('update:search', val);
}

// Hilfsfunktion zur Datumsformatierung
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