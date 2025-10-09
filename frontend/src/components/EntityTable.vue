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
    />
  </v-card>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const props = defineProps<{
  headers: any[],
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
</script>