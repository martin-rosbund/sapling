<template>
  <v-select
    :model-value="modelValue"
    :items="booleanItems"
    item-title="title"
    item-value="value"
    label="Wert"
    density="comfortable"
    variant="outlined"
    hide-details
    class="sapling-table-filter-menu__field"
    @update:model-value="updateValue"
  />
</template>

<script lang="ts" setup>
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const booleanItems = [
  { title: 'Alle', value: '' },
  { title: 'Ja', value: 'true' },
  { title: 'Nein', value: 'false' },
];

function updateValue(value: string | null) {
  emit('update:modelValue', value ?? '');
}
</script>