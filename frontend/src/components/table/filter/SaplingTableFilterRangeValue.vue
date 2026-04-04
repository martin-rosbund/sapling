<template>
  <div class="sapling-table-filter-menu__range">
    <v-text-field
      :model-value="startValue"
      :type="inputType"
      label="Von"
      :placeholder="startPlaceholder"
      :prefix="prefix"
      :suffix="suffix"
      :step="step"
      density="comfortable"
      variant="outlined"
      hide-details
      class="sapling-table-filter-menu__field"
      @update:model-value="value => emit('update:startValue', normalizeValue(value))"
    />
    <v-text-field
      :model-value="endValue"
      :type="inputType"
      label="Bis"
      :placeholder="endPlaceholder"
      :prefix="prefix"
      :suffix="suffix"
      :step="step"
      density="comfortable"
      variant="outlined"
      hide-details
      class="sapling-table-filter-menu__field"
      @update:model-value="value => emit('update:endValue', normalizeValue(value))"
    />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  startValue: string;
  endValue: string;
  inputType: string;
  startPlaceholder: string;
  endPlaceholder: string;
  prefix?: string;
  suffix?: string;
  step?: string;
}>();

const emit = defineEmits<{
  'update:startValue': [value: string];
  'update:endValue': [value: string];
}>();

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value);
}
</script>

<style scoped src="@/assets/styles/SaplingTableColumnFilter.css"></style>