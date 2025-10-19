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
      <template v-if="col.key === '__actions' && showActions">
        <div class="actions-wrapper">
          <v-btn-group>
            <v-btn v-if="entity?.canUpdate" icon="mdi-pencil" size="small" @click.stop="$emit('edit', item)"></v-btn>
            <v-btn v-if="entity?.canDelete" icon="mdi-delete" size="small" @click.stop="$emit('delete', item)"></v-btn>   
          </v-btn-group>
        </div>
      </template>
      <!-- Render button for 1:m columns (array value) -->
      <template v-else-if="['1:m'].includes(col.kind || '') && Array.isArray(item[col.key || '']) && (item[col.key || ''] as unknown[]).length > 0">
        <v-btn color="primary" size="small" @click.stop="handleArrayClick(item[col.key || ''])">
          {{ (item[col.key || ''] as unknown[]).length ?? 0 }}
        </v-btn>
      </template>
      <template v-else-if="['m:1'].includes(col.kind || '') && isObject(item[col.key || ''])">
        <v-btn color="primary" size="small" @click.stop="handleObjectClick(item[col.key || ''])">
          {{ $t('view') }}
        </v-btn>
      </template>
      <!-- Render boolean as checkbox -->
      <template v-else-if="typeof item[col.key || ''] === 'boolean'">
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
import type { EntityItem } from '@/entity/entity';
import { formatValue } from './tableUtils';
import { defineProps } from 'vue';
import { isObject } from 'vuetify/lib/util/helpers.mjs';

/**
 * Props for EntityTableRow.
 * - showActions: controls if the actions column is rendered
 */
interface EntityTableRowProps {
  item: Record<string, unknown>;
  columns: { key: string; type?: string; kind?: string }[];
  index: number;
  selectedRow: number | null;
  entity: EntityItem | null;
  showActions?: boolean;
}
const props = defineProps<EntityTableRowProps>();
const showActions = props.showActions !== false;

function handleObjectClick(obj: unknown) {
  // Placeholder for m:1 object click
  // You can emit an event here if needed
}

function handleArrayClick(arr: unknown) {
  // Placeholder for 1:m array click
  // You can emit an event here if needed
}
</script>

<style scoped>
/* Inherit row/cell styles from parent table */
</style>