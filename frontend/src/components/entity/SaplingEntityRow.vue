<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': selectedRow === index }"
    @click="$emit('select-row', index)"
    style="cursor: pointer;"
  >
    <!-- Actions cell at the start of the row -->
    <td v-if="showActions" class="actions-cell">
      <v-menu ref="menuRef" v-model="menuActive">
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
          <v-list-item @click.stop="menuActive = false">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.close') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
    <!-- Render all other columns except actions -->
    <template v-for="col in columns.filter(x => x.kind !== '1:m' && x.kind !== 'm:n' && x.kind !== 'n:m')" :key="col.key ?? ''">
      <td v-if="col.key !== '__actions'">
        <!-- Expansion panel for m:1 columns (object value) -->
        <template v-if="['m:1'].includes(col.kind || '') && isObject(item[col.key || ''])">
          <span v-if="isReferenceColumnsReady">
            <SaplingEntityReferencePanel
              :reference-object="(item[col.key || ''] as Record<string, unknown>)"
              :col="col"
              :get-reference-columns="getReferenceColumnsTyped"
              :get-reference-display-short="getReferenceDisplayShort"
              @reference-click="menuActive = false"
            />
          </span>
          <span v-else>
            <v-skeleton-loader type="table-row" :loading="true" />
          </span>
        </template>
        <template v-else-if="typeof item[col.key || ''] === 'boolean'">
          <v-checkbox :model-value="item[col.key || '']" :disabled="true" hide-details/>
        </template>
        <template v-else>
          {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
        </template>
      </td>
    </template>
    <!-- Relations-Menü am Ende der Zeile -->
    <td class="relations-menu-cell">
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-link-variant" size="small" @click.stop></v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="relCol in columns.filter(c => ['1:m', 'm:n', 'n:m'].includes(c.kind || ''))"
            :key="relCol.key"
            @click.stop="toggleExpand(index, relCol.key)">
            <v-icon start>mdi-link-variant</v-icon>
            <span>{{ $t(`${entity?.handle}.${relCol.name}`) }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
  </tr>
  <!-- Detailbereich für 1:m/m:n/n:m Relationen -->
  <tr v-if="expandedRow === index && expandedColKey">
    <td :colspan="columns.length + 1">
      <template v-if="!relationLoading[expandedColKey] && isReferenceTemplatesReady">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
          <v-btn color="default" size="small" @click="expandedRow = null; expandedColKey = null">
            <v-icon start>mdi-eye-off</v-icon>
            <span>Hide</span>
          </v-btn>
        </div>
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
import SaplingEntityReferencePanel from './SaplingEntityReferencePanel.vue';
import type { EntityItem } from '@/entity/entity';
import { formatValue } from './saplingEntityUtils';
import { defineProps, ref, onMounted, watch, computed, watchEffect } from 'vue';
import { isObject } from 'vuetify/lib/util/helpers.mjs';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import { ensureReferenceColumns, getReferenceColumns, getReferenceTemplates } from './saplingEntityReferenceCache';
import SaplingEntity from './SaplingEntity.vue';
import ApiGenericService from '@/services/api.generic.service';
import type { SaplingEntityHeader } from '@/composables/entity/useSaplingEntity';
import '@/assets/styles/SaplingEntityRow.css';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import { i18n } from '@/i18n';
// #endregion

// #region Menu Ref for Close Button
import { ref as vueRef } from 'vue';
const menuRef = vueRef();
const menuActive = vueRef(false);
// #endregion

// #region Helper Functions
/**
 * Returns the filter for the child relation (PK/FK mapping).
 * Used to filter related entities in expanded rows.
 * @param item The current row item.
 * @param colKey The column key for the relation.
 * @returns An object representing the filter for the child relation.
 */
function getRelationFilter(item: Record<string, unknown>, colKey: string) {
  const col = props.columns.find(c => c.key === colKey);
  if (!col || !col.referenceName) return {};
  // mappedBy = FK in child, PK in parent
  if (col.mappedBy) {
    const pk = Object.keys(item).find(k => typeof k === 'string' && item[k] !== undefined);
    if (pk) {
      return { [col.mappedBy]: item[pk] };
    }
  }
  // Fallback: no filter
  return {};
}

/**
 * Typed wrapper für getReferenceColumns, damit der Rückgabetyp zu EntityTemplate[] passt.
 */
function getReferenceColumnsTyped(referenceName: string): EntityTemplate[] {
  return getReferenceColumns(referenceName) as EntityTemplate[];
}
// #endregion

// #region Props and Emits
/**
 * Props for SaplingEntityRow component.
 */
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
/**
 * State variables for expanded rows, relation data, and permissions.
 */
const expandedRow = ref<number | null>(null); // Currently expanded relation row
const expandedColKey = ref<string | null>(null); // Currently expanded relation column key
const relationData = ref<Record<string, unknown[]>>({}); // Data for expanded relations
const relationCounts = ref<Record<string, number>>({}); // Counts for expanded relations
const relationLoading = ref<Record<string, boolean>>({}); // Loading state for expanded relations
const entityReferencePermission = ref<AccumulatedPermission | null>(null); // Current user's permissions for reference entity
const isReferenceColumnsReady = ref(false); // Whether reference columns are loaded
// #endregion

// #region Lifecycle
/**
 * Lifecycle hooks for loading reference columns and templates.
 * Loads all reference columns on mount and when columns change.
 * Loads reference templates and permissions when a relation is expanded.
 */
onMounted(() => loadAllReferenceColumnsCentral(props.columns));
watch(() => props.columns, (newColumns) => loadAllReferenceColumnsCentral(newColumns));

watchEffect(async () => {
  if (expandedColKey.value && referenceName.value) {
    isReferenceTemplatesReady.value = false;
    await ensureReferenceColumns(referenceName.value);
    referenceTemplates.value = getReferenceTemplates(referenceName.value);
    // Show all columns including relations (hide only system/auto-increment fields)
    referenceHeaders.value = referenceTemplates.value
      .filter(tpl => !tpl.isSystem && !tpl.isAutoIncrement)
      .map(tpl => ({
        ...tpl,
        key: tpl.name,
        title: i18n.global.t(`${referenceName.value}.${tpl.name}`)
      }));
    await loadReferenceEntity(referenceName.value);
    await setEntityReferencePermissions();
    isReferenceTemplatesReady.value = true;
  }
});
// #endregion

// #region Methods

/**
 * Toggles the expansion of 1:m, m:n, n:m relation columns.
 * Loads related data if not already loaded.
 * @param rowIdx The row index.
 * @param colKey The column key.
 */
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
            filter = col.mappedBy ? { [col.mappedBy]: props.item[pk] } : col.inversedBy ? { [col.inversedBy]: props.item[pk] } : {}
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

/**
 * Returns a short display string for a reference object (first two columns).
 * Used for button labels in m:1 columns.
 * @param obj The reference object.
 * @param col The column definition.
 * @returns A string with up to two values joined by ' | '.
 */
function getReferenceDisplayShort(obj: Record<string, unknown>, col: EntityTemplate): string {
  if (!col.referenceName || !obj) return '';
  const columns = getReferenceColumns(col.referenceName);
  return columns?.slice(0, 2).map(c => obj[c.key]).filter(Boolean).join(' | ') || '';
}
// #endregion

// #region Reference Expansion State
/**
 * Loads all reference columns for m:1 columns in the table.
 * Ensures that reference columns are cached for quick access.
 * @param columns The list of entity columns.
 */
async function loadAllReferenceColumnsCentral(columns: EntityTemplate[]) {
  isReferenceColumnsReady.value = false;
  const m1Columns = columns.filter(col => col.kind === 'm:1' && col.referenceName);
  const uniqueRefs = Array.from(new Set(m1Columns.map(col => col.referenceName)));
  await Promise.all(uniqueRefs.map(ref => ensureReferenceColumns(ref!)));
  isReferenceColumnsReady.value = true;
}
// #endregion

// #region Reference Details Expansion
/**
 * State and logic for expanded reference details (m:1, etc.).
 */
const isReferenceTemplatesReady = ref(false); // Whether reference templates are loaded
const referenceTemplates = ref<EntityTemplate[]>([]); // Cached reference templates
const referenceHeaders = ref<SaplingEntityHeader[]>([]); // Headers for expanded reference table
const referenceName = computed(() => {
  const col = props.columns.find(c => c.key === expandedColKey.value);
  return col?.referenceName || '';
});
const referenceEntity = ref<EntityItem | null>(null); // The referenced entity definition

/**
 * Loads the referenced entity definition for the expanded relation.
 * @param referenceName The name of the referenced entity.
 */
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
/**
 * Loads the current user's permissions for the referenced entity (People/Company).
 */
async function setEntityReferencePermissions() {
  const currentPermissionStore = useCurrentPermissionStore();
  await currentPermissionStore.fetchCurrentPermission();
  entityReferencePermission.value = currentPermissionStore.accumulatedPermission?.find(x => x.entityName === referenceEntity.value?.handle) || null;
}
// #endregion
</script>