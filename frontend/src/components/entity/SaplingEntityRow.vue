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
      <template v-else-if="['1:m', 'm:n', 'n:m'].includes(col.kind || '')">
        <v-btn color="primary" size="small" min-width="60px"
          @click.stop="toggleExpand(index, col.key)">
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <!-- Render für m:1 columns (object value) als Expansion Panel mit allen Werten -->
      <template v-else-if="['m:1'].includes(col.kind || '') && isObject(item[col.key || ''])">
        <template v-if="isReferenceColumnsReady">
          <v-expansion-panels>
            <v-expansion-panel>
              <v-expansion-panel-title class="entity-expansion-title">
                {{ getReferenceDisplayShort(item[col.key || ''] as Record<string, unknown>, col) || (col.referenceName || $t('global.details')) }}
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <table class="child-row-table">
                  <tbody>
                    <tr v-for="refCol in getReferenceColumns(col.referenceName)" :key="refCol.key">
                      <th>{{ $t(`${col.referenceName}.${refCol.name}`) }}</th>
                      <td>{{ (item[col.key || ''] && (item[col.key || ''] as Record<string, unknown>)[refCol.key]) ?? '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
        <template v-else>
          <v-skeleton-loader type="table-row" :loading="true" />
        </template>
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
  <!-- Detailbereich für 1:m/m:n/n:m Relationen -->
  <tr v-if="expandedRow === index && expandedColKey">
    <td :colspan="columns.length">
      <template v-if="!relationLoading[expandedColKey] && isReferenceTemplatesReady">
        <SaplingEntity
          :headers="referenceHeaders"
          :items="[]"
          :items-override="relationData[expandedColKey] || []"
          :entity-name="referenceName"
          :templates="referenceTemplates"
          :entity="referenceEntity"
          :search="''"
          :page="1"
          :items-per-page="100"
          :total-items="relationCounts[expandedColKey] ?? 0"
          :is-loading="false"
          :sort-by="[]"
        />
      </template>
      <template v-else>
        <v-skeleton-loader type="table-row" :loading="true" />
      </template>
    </td>
  </tr>
</template>

<script lang="ts" setup>
import type { EntityItem } from '@/entity/entity';
import { formatValue } from './saplingEntityUtils';
import { defineProps, ref, onMounted, watch, computed, watchEffect } from 'vue';
import { isObject } from 'vuetify/lib/util/helpers.mjs';
import type { EntityTemplate } from '@/entity/structure';
import { ensureReferenceColumns, getReferenceColumns, getReferenceTemplates } from './saplingEntityReferenceCache';
import SaplingEntity from './SaplingEntity.vue';
import { useI18n } from 'vue-i18n';
import ApiGenericService from '@/services/api.generic.service';
const { t } = useI18n();

interface SaplingEntityRowProps {
  item: Record<string, unknown>;
  columns: EntityTemplate[];
  index: number;
  selectedRow: number | null;
  entity: EntityItem | null;
  showActions?: boolean;
}

// Emits-Definition für Custom Events, damit Vue keine Warnung ausgibt
defineEmits(['select-row', 'edit', 'delete']);

const props = defineProps<SaplingEntityRowProps>();
const showActions = props.showActions !== false;

// State für expandierte Relation
const expandedRow = ref<number | null>(null);
const expandedColKey = ref<string | null>(null);
// State für dynamisch geladene Relationen
const relationData = ref<Record<string, unknown[]>>({});
const relationCounts = ref<Record<string, number>>({});
const relationLoading = ref<Record<string, boolean>>({});

async function toggleExpand(rowIdx: number, colKey: string) {
  if (expandedRow.value === rowIdx && expandedColKey.value === colKey) {
    expandedRow.value = null;
    expandedColKey.value = null;
  } else {
    expandedRow.value = rowIdx;
    expandedColKey.value = colKey;
    // Dynamisch nachladen, falls noch nicht geladen
    if (!relationData.value[colKey]) {
      relationLoading.value[colKey] = true;
      try {
        // Hole die Spalte und Referenzinfos
        const col = props.columns.find(c => c.key === colKey);
        if (col && col.referenceName) {
          // Lade Referenz-Templates, um den FK zu finden
          await ensureReferenceColumns(col.referenceName);
          // Suche nach einer Spalte, die auf das aktuelle Entity zeigt
          let filter = {};
          // Fallback: versuche mit erstem PK, nur wenn vorhanden und String
          const pk = Object.keys(props.item).find(k => typeof k === 'string' && props.item[k] !== undefined);

          if (pk) {
            filter = col.mappedBy ? { [col.mappedBy]: props.item[pk] } : {};
          }
          const result = await ApiGenericService.find(col.referenceName, { filter, limit: 100, page: 1 });
          relationData.value[colKey] = result.data;
          relationCounts.value[colKey] = result.meta?.total ?? result.data.length;
        } else {
          relationData.value[colKey] = [];
          relationCounts.value[colKey] = 0;
        }
      } catch {
        relationData.value[colKey] = [];
        relationCounts.value[colKey] = 0;
      } finally {
        relationLoading.value[colKey] = false;
      }
    }
  }
}

// Lade alle benötigten Referenzspalten beim Mount und bei Columns-Änderung zentral
const isReferenceColumnsReady = ref(false);
async function loadAllReferenceColumnsCentral(columns: EntityTemplate[]) {
  isReferenceColumnsReady.value = false;
  const m1Columns = columns.filter(col => col.kind === 'm:1' && col.referenceName);
  const uniqueRefs = Array.from(new Set(m1Columns.map(col => col.referenceName)));
  await Promise.all(uniqueRefs.map(ref => ensureReferenceColumns(ref!)));
  isReferenceColumnsReady.value = true;
}
onMounted(() => loadAllReferenceColumnsCentral(props.columns));
watch(() => props.columns, (newColumns) => loadAllReferenceColumnsCentral(newColumns));
// Gibt die ersten beiden anzuzeigenden Werte für eine Referenz zurück (für Button)
function getReferenceDisplayShort(obj: Record<string, unknown>, col: EntityTemplate): string {
  if (!col.referenceName || !obj) return '';
  const columns = getReferenceColumns(col.referenceName);
  return columns?.slice(0, 2).map(c => obj[c.key]).filter(Boolean).join(' | ') || '';
}

const isReferenceTemplatesReady = ref(false);
const referenceTemplates = ref<EntityTemplate[]>([]);
import type { SaplingEntityHeader } from '@/composables/useSaplingEntity';
const referenceHeaders = ref<SaplingEntityHeader[]>([]);
const referenceName = computed(() => {
  const col = props.columns.find(c => c.key === expandedColKey.value);
  return col?.referenceName || '';
});
const referenceEntity = ref<EntityItem | null>(null);

async function loadReferenceEntity(referenceName: string) {
  if (!referenceName) {
    referenceEntity.value = null;
    return;
  }
  // Analog zu useSaplingEntity.loadEntity
  const result = await ApiGenericService.find<EntityItem>(
    'entity',
    {  filter: { handle: referenceName }, limit: 1, page: 1 }
  );
  referenceEntity.value = result.data[0] || null;
}

watchEffect(async () => {
  if (expandedColKey.value && referenceName.value) {
    isReferenceTemplatesReady.value = false;
    await ensureReferenceColumns(referenceName.value);
    referenceTemplates.value = getReferenceTemplates(referenceName.value);
    referenceHeaders.value = referenceTemplates.value
      .filter(tpl => !tpl.isSystem && !tpl.isAutoIncrement && !tpl.isReference)
      .map(tpl => ({
        ...tpl,
        key: tpl.name,
        title: t(`${referenceName.value}.${tpl.name}`)
      }));
    await loadReferenceEntity(referenceName.value);
    isReferenceTemplatesReady.value = true;
  }
});
</script>

<style scoped>
.child-row-table th {
  text-align: left;
  padding: 0.3em 1em 0.3em 0;
}
.child-row-table {
  border-collapse: collapse;
  margin-top: 0.5em;
}
.entity-expansion-title {
  min-height: 36px;
  max-height: 36px;
  display: flex;
  overflow: hidden;
  white-space: nowrap;
}
</style>