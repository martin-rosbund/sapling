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
import { i18n } from '@/i18n' // Import the internationalization instance

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const booleanItems = [
  { title: i18n.global.t('filter.all'), value: '' },
  { title: i18n.global.t('filter.yes'), value: 'true' },
  { title: i18n.global.t('filter.no'), value: 'false' },
]

function updateValue(value: string | null) {
  emit('update:modelValue', value ?? '')
}
</script>
