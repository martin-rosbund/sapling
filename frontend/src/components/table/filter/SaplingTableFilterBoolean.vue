<template>
  <div
    class="sapling-table-boolean-filter"
    @click.stop
    @mousedown.stop
    @keydown.stop
  >
    <v-checkbox-btn
      :model-value="modelValue === 'true'"
      :indeterminate="modelValue === ''"
      density="compact"
      class="sapling-table-boolean-checkbox"
      @click.stop="emit('toggle')"
    />
    <button
      class="sapling-table-header-button sapling-table-boolean-label"
      type="button"
      @click.stop="emit('toggle')"
    >
      <span>{{ title }}</span>
    </button>
    <v-btn
      icon
      variant="text"
      size="x-small"
      class="sapling-table-filter-sort"
      @click.stop="emit('sort')"
    >
      <v-icon size="small">{{ sortIcon }}</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
interface SaplingTableFilterBooleanProps {
  modelValue: string;
  title: string;
  sortIcon: unknown;
}

defineProps<SaplingTableFilterBooleanProps>();

const emit = defineEmits<{
  toggle: [];
  sort: [];
}>();
</script>

<style scoped>
.sapling-table-boolean-filter {
  display: inline-flex;
  align-items: center;
  min-width: 120px;
  gap: 2px;
}

.sapling-table-boolean-checkbox {
  flex: 0 0 auto;
}

.sapling-table-boolean-label {
  flex: 1 1 auto;
  min-width: 0;
}

.sapling-table-header-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.sapling-table-filter-sort {
  min-width: 26px;
  width: 26px;
  padding: 0;
}
</style>