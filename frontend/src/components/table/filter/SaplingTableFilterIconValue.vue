<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="mdiIcons"
    item-title="name"
    item-value="name"
    label="Icon"
    density="comfortable"
    variant="outlined"
    hide-details
    clearable
    class="sapling-table-filter-menu__field"
    @update:model-value="updateValue"
  >
    <template #item="{ item, props: itemProps }">
      <v-list-item
        v-bind="itemProps"
        :prepend-icon="item.name"
        :title="item.name"
      />
    </template>
    <template #selection="{ item }">
      <div class="sapling-table-filter-icon-selection">
        <v-icon size="small">{{ item.name }}</v-icon>
        <span>{{ item.name }}</span>
      </div>
    </template>
  </v-autocomplete>
</template>

<script lang="ts" setup>
import { mdiIcons } from '@/constants/mdi.icons';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function updateValue(value: string | null) {
  emit('update:modelValue', value ?? '');
}
</script>

<style scoped src="@/assets/styles/SaplingTableColumnFilter.css"></style>