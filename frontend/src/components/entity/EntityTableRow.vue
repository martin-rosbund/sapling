<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': selectedRow === index }"
    @click="$emit('select-row', index)"
    style="cursor: pointer;"
  >
    <td
      v-for="col in columns"
      :key="col.key ?? ''"
      :class="{ 'actions-cell': col.key === '__actions' }"
    >
      <!-- Render action buttons if actions column -->
      <template v-if="col.key === '__actions'">
        <div class="actions-wrapper">
          <v-btn v-if="entity?.canUpdate" icon size="small" @click.stop="$emit('edit', item)"><v-icon>mdi-pencil</v-icon></v-btn>
          <v-btn v-if="entity?.canDelete" icon size="small" @click.stop="$emit('delete', item)"><v-icon>mdi-delete</v-icon></v-btn>
        </div>
      </template>
      <!-- Render boolean as checkbox -->
      <template v-else-if="typeof item[col.key || ''] === 'boolean'">
        <!-- Avoid mutating props: use :model-value instead of v-model -->
        <v-checkbox :model-value="item[col.key || '']" :disabled="true" hide-details/>
      </template>
      <!-- Render formatted value for other types -->
      <template v-else>
        {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
      </template>
    </td>
  </tr>
</template>

<script lang="ts" setup>
// Modular table row for EntityTable
import type { EntityItem } from '@/entity/entity';
import { formatValue } from './tableUtils';
import { defineProps } from 'vue';

// Define prop types for better type safety
interface EntityTableRowProps {
  item: Record<string, unknown>;
  columns: { key: string; type?: string }[];
  index: number;
  selectedRow: number | null;
  entity: EntityItem | null;
}
defineProps<EntityTableRowProps>();
</script>

<style scoped>
/* Inherit row/cell styles from parent table */
</style>