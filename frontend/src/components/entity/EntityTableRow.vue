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
      <template v-else-if="['1:m', 'm:n', 'n:m'].includes(col.kind || '') && Array.isArray(item[col.key || '']) && (item[col.key || ''] as unknown[]).length > 0">
        <v-btn color="primary" size="small" @click.stop="handleArrayClick(item[col.key || ''])">
          {{ (item[col.key || ''] as unknown[]).length ?? 0 }}
        </v-btn>
      </template>
      <!-- Render button for m:1 columns (object value) -->
      <template v-else-if="['m:1'].includes(col.kind || '') && isObject(item[col.key || ''])">
        <v-btn color="primary" size="small" @click.stop="handleObjectClick(item[col.key || ''])">
          {{ getReferenceDisplay(item[col.key || ''], col) || '-' }}
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
import { defineProps, ref, onMounted, watch } from 'vue';
import { isObject } from 'vuetify/lib/util/helpers.mjs';
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';

interface EntityTableRowProps {
  item: Record<string, unknown>;
  columns: { key: string; type?: string; kind?: string; referenceName?: string }[];
  index: number;
  selectedRow: number | null;
  entity: EntityItem | null;
  showActions?: boolean;
}
const props = defineProps<EntityTableRowProps>();
const showActions = props.showActions !== false;

// Map: referenceName => columns[]
const referenceColumnsMap = ref<Record<string, { key: string, name: string }[]>>({});

// Lädt die anzuzeigenden Spalten für eine m:1-Referenz
async function ensureReferenceColumns(referenceName: string) {
  if (!referenceName || referenceColumnsMap.value[referenceName]) return;
  const templates = await ApiService.findAll<EntityTemplate[]>(`template/${referenceName}`);
  referenceColumnsMap.value[referenceName] = templates
    .filter(t => !t.isSystem && !t.isAutoIncrement && !t.isReference)
    .map(t => ({
      key: t.name,
      name: t.name
    }));
}

// Beim Mount: für alle m:1-Columns die ReferenceColumns laden
onMounted(async () => {
  const m1Columns = props.columns.filter(col => col.kind === 'm:1' && col.referenceName);
  for (const col of m1Columns) {
    await ensureReferenceColumns(col.referenceName!);
  }
});

// Wenn Columns sich ändern, nachladen
watch(
  () => props.columns,
  async (newColumns) => {
    const m1Columns = newColumns.filter(col => col.kind === 'm:1' && col.referenceName);
    for (const col of m1Columns) {
      await ensureReferenceColumns(col.referenceName!);
    }
  }
);

// Hilfsfunktion: Gibt die anzuzeigenden Werte für eine Referenz zurück
function getReferenceDisplay(obj: any, col: any): string {
  if (!col.referenceName || !referenceColumnsMap.value[col.referenceName] || !obj) return '';
  const columns = referenceColumnsMap.value[col.referenceName];
  return columns?.map(c => obj[c.key]).filter(Boolean).join(' | ') || '';
}

function handleObjectClick(obj: unknown) {
  // Placeholder for m:1 object click
}

function handleArrayClick(arr: unknown) {
  // Placeholder for 1:m array click
}
</script>

<style scoped>
/* Inherit row/cell styles from parent table */
</style>