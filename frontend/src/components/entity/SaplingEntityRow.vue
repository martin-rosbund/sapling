<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': selectedRow === index }"
    @click="$emit('select-row', index)"
    style="cursor: pointer;"
  >
    <!-- Actions cell at the start of the row -->
    <td v-if="showActions" class="actions-cell">
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="small" @click.stop></v-btn>
        </template>
        <v-list>
          <v-list-item v-if="entity?.canUpdate && entityPermission?.allowUpdate" @click.stop="$emit('edit', item)">
            <v-icon start>mdi-pencil</v-icon>
            <span>{{ $t('global.edit') }}</span>
          </v-list-item>
          <v-list-item v-if="entity?.canDelete && entityPermission?.allowDelete" @click.stop="$emit('delete', item)">
            <v-icon start>mdi-delete</v-icon>
            <span>{{ $t('global.delete') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
    <!-- Render all other columns except actions -->
    <template v-for="col in columns" :key="col.key ?? ''">
      <td v-if="col.key !== '__actions'">
        <!-- Button for 1:m columns (array value) -->
        <template v-if="['1:m', 'm:n', 'n:m'].includes(col.kind || '')">
          <v-btn color="primary" size="small" min-width="60px"
            @click.stop="toggleExpand(index, col.key)">
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <!-- Expansion panel for m:1 columns (object value) -->
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
    </template>
  </tr>
  <!-- Detailbereich für 1:m/m:n/n:m Relationen -->
  <tr v-if="expandedRow === index && expandedColKey">
    <td :colspan="columns.length">
      <template v-if="!relationLoading[expandedColKey] && isReferenceTemplatesReady">
        <SaplingEntity
          :headers="referenceHeaders"
          :items="[]"
          :search="''"
          :page="1"
          :items-per-page="DEFAULT_PAGE_SIZE_MEDIUM"
          :total-items="relationCounts[expandedColKey] ?? 0"
          :is-loading="false"
          :sort-by="[]"
          :entity-name="referenceName"
          :entity-templates="referenceTemplates"
          :entity="referenceEntity"
          :entity-permission="entityPermission"
          :parent-filter="getRelationFilter(item, expandedColKey)"
        />
      </template>
      <template v-else>
        <v-skeleton-loader type="table-row" :loading="true" />
      </template>
    </td>
  </tr>

</template>

<script lang="ts" setup>
// #region Imports
import type { EntityItem } from '@/entity/entity';
import { formatValue } from './saplingEntityUtils';
import { defineProps, ref, onMounted, watch, computed, watchEffect } from 'vue';
import { isObject } from 'vuetify/lib/util/helpers.mjs';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import { ensureReferenceColumns, getReferenceColumns, getReferenceTemplates } from './saplingEntityReferenceCache';
import SaplingEntity from './SaplingEntity.vue';
// Gibt den Filter für die Kind-Relation zurück (PK/FK-Verknüpfung)
function getRelationFilter(item: Record<string, unknown>, colKey: string) {
  const col = props.columns.find(c => c.key === colKey);
  if (!col || !col.referenceName) return {};
  // mappedBy = FK in Kind, PK in Parent
  if (col.mappedBy) {
    // mappedBy ist der FK in der Kind-Tabelle, PK im Parent
    const pk = Object.keys(item).find(k => typeof k === 'string' && item[k] !== undefined);
    if (pk) {
      return { [col.mappedBy]: item[pk] };
    }
  }
  // Fallback: kein Filter
  return {};
}
import { useI18n } from 'vue-i18n';
import ApiGenericService from '@/services/api.generic.service';
import type { SaplingEntityHeader } from '@/composables/entity/useSaplingEntity';
import '@/assets/styles/SaplingEntityRow.css';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
// #endregion

// #region Props and Emits
const { t } = useI18n();
interface SaplingEntityRowProps {
  item: Record<string, unknown>;
  columns: EntityTemplate[];
  index: number;
  selectedRow: number | null;
  entity: EntityItem | null;
  entityPermission: AccumulatedPermission | null;
  showActions?: boolean;
}
defineEmits(['select-row', 'edit', 'delete']);
const props = defineProps<SaplingEntityRowProps>();
const showActions = props.showActions !== false;
// #endregion

// #region State
const expandedRow = ref<number | null>(null); // Expanded relation row
const expandedColKey = ref<string | null>(null); // Expanded relation column key
const relationData = ref<Record<string, unknown[]>>({}); // Data for expanded relations
const relationCounts = ref<Record<string, number>>({}); // Counts for expanded relations
const relationLoading = ref<Record<string, boolean>>({}); // Loading state for expanded relations
const ownReferencePermission = ref<AccumulatedPermission | null>(null); // Current user's permissions
const isReferenceColumnsReady = ref(false);
// #endregion

// #region Lifecycle
onMounted(() => loadAllReferenceColumnsCentral(props.columns));
watch(() => props.columns, (newColumns) => loadAllReferenceColumnsCentral(newColumns));

watchEffect(async () => {
  if (expandedColKey.value && referenceName.value) {
    isReferenceTemplatesReady.value = false;
    await ensureReferenceColumns(referenceName.value);
    referenceTemplates.value = getReferenceTemplates(referenceName.value);
    // Alle Spalten inkl. Relationen anzeigen (nur System/AutoIncrement ausblenden)
    referenceHeaders.value = referenceTemplates.value
      .filter(tpl => !tpl.isSystem && !tpl.isAutoIncrement)
      .map(tpl => ({
        ...tpl,
        key: tpl.name,
        title: t(`${referenceName.value}.${tpl.name}`)
      }));
    await loadReferenceEntity(referenceName.value);
    await setOwnReferencePermissions();
    isReferenceTemplatesReady.value = true;
  }
});
// #endregion

// #region Methods

// Toggle expansion for 1:m, m:n, n:m columns
async function toggleExpand(rowIdx: number, colKey: string) {
  if (expandedRow.value === rowIdx && expandedColKey.value === colKey) {
    expandedRow.value = null;
    expandedColKey.value = null;
  } else {
    expandedRow.value = rowIdx;
    expandedColKey.value = colKey;
    if (!relationData.value[colKey]) {
      relationLoading.value[colKey] = true;
      try {
        const col = props.columns.find(c => c.key === colKey);
        if (col && col.referenceName) {
          await ensureReferenceColumns(col.referenceName);
          let filter = {};
          const pk = Object.keys(props.item).find(k => typeof k === 'string' && props.item[k] !== undefined);
          if (pk) {
            filter = col.mappedBy ? { [col.mappedBy]: props.item[pk] } : {};
          }
          const result = await ApiGenericService.find(col.referenceName, { filter, limit: DEFAULT_PAGE_SIZE_MEDIUM, page: 1, relations: ['m:1'] });
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

// Get the first two display values for a reference (for button)
function getReferenceDisplayShort(obj: Record<string, unknown>, col: EntityTemplate): string {
  if (!col.referenceName || !obj) return '';
  const columns = getReferenceColumns(col.referenceName);
  return columns?.slice(0, 2).map(c => obj[c.key]).filter(Boolean).join(' | ') || '';
}
// #endregion

// #region Reference Expansion State
async function loadAllReferenceColumnsCentral(columns: EntityTemplate[]) {
  isReferenceColumnsReady.value = false;
  const m1Columns = columns.filter(col => col.kind === 'm:1' && col.referenceName);
  const uniqueRefs = Array.from(new Set(m1Columns.map(col => col.referenceName)));
  await Promise.all(uniqueRefs.map(ref => ensureReferenceColumns(ref!)));
  isReferenceColumnsReady.value = true;
}

// #endregion

// #region Reference Details Expansion
const isReferenceTemplatesReady = ref(false);
const referenceTemplates = ref<EntityTemplate[]>([]);
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
  const result = await ApiGenericService.find<EntityItem>(
    'entity',
    {  filter: { handle: referenceName }, limit: 1, page: 1 }
  );
  referenceEntity.value = result.data[0] || null;
}
// #endregion

// #region Permission
//#region People and Company
async function setOwnReferencePermissions(){
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    ownReferencePermission.value = currentPermissionStore.accumulatedPermission?.find(x => x.entityName === referenceEntity.value?.handle) || null;
}
// #endregion
</script>