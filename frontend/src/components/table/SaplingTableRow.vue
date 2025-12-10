<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': !props.multiSelect && selectedRow === index, 'multi-selected-row': props.multiSelect && selectedRows && selectedRows.includes(index) }"
    @mousedown="$emit('select-row', index)"
    style="cursor: pointer;"
  >
    <!-- Multi-select checkbox cell -->
    <td v-if="multiSelect && columns[0]?.key === '__select'" class="select-cell" style="width: 40px; max-width: 40px; text-align: center;">
      <v-checkbox
        :model-value="selectedRows && selectedRows.includes(index)"
        @mousedown.stop="$emit('select-row', index)"
        hide-details
        density="compact"
      />
    </td>
    <!-- Render all other columns except actions -->
    <template v-for="col in columns"
      :key="col.key ?? ''">
      <td v-if="col.key !== '__actions' && col.key !== '__select'" :class="'cellProps' in col ? col.cellProps?.class : undefined">
        <div v-if="'options' in col && col.options?.includes('isChip')">
          <SaplingTableChip :item="item" :col="col" :references="references" />
        </div>
        <!-- Expansion panel for m:1 columns (object value) -->
        <div v-else-if="'kind' in col && ['m:1'].includes(col.kind || '')">
          <template v-if="item[col.key || ''] && !(references[col.referenceName || '']?.getState(col.referenceName || '').isLoading ?? true)">
            <SaplingTableReference
              :object="item[col.key || '']"
              :headers="'referenceName' in col ? getHeaders(col.referenceName || '') : []"/>
          </template>
          <template v-else-if="!item[col.key || '']?.isLoading">
            <div></div>
          </template>
          <template v-else>
            <v-skeleton-loader type="table-row" class="glass-panel" width="100%" />
          </template>
        </div>
        <div v-else-if="typeof item[col.key || ''] === 'boolean'">
          <v-checkbox :model-value="item[col.key || '']" :disabled="true" hide-details/>
        </div>
        <div v-else-if="'options' in col && col.options?.includes('isColor')">
          <v-chip :color="item[col.key]" small>{{ item[col.key] }}</v-chip>
        </div>
        <div v-else-if="'options' in col && col.options?.includes('isIcon')">
          <v-icon>{{ item[col.key] }}</v-icon>
        </div>
        <div v-else-if="'options' in col && col.options?.includes('isPhone')">
          <v-icon start small class="mr-1">mdi-phone</v-icon>
          <a :href="`tel:${item[col.key || '']}`">
            {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
          </a>
        </div>
        <div v-else-if="'options' in col && col.options?.includes('isMail')">
          <v-icon start small class="mr-1">mdi-email</v-icon>
          <a :href="`mailto:${item[col.key || '']}`">
            {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
          </a>
        </div>
        <div v-else-if="'options' in col && col.options?.includes('isLink')">
          <v-icon start small class="mr-1">mdi-link-variant</v-icon>
          <a :href="formatLink(item[col.key || ''])" target="_blank" rel="noopener noreferrer">
            {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
          </a>
        </div>
        <div v-else-if="col.type === 'JsonType'">
          <SaplingTableJson
            :item="item"
            :template="col"
            :entityName="props.entityName"
          />
        </div>
        <div v-else>
          {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
        </div>
      </td>
    </template>
    <!-- Actions cell at the end of the row -->
    <td v-if="showActions && columns.some(c => c.key === '__actions')" class="actions-cell" style="width: 75px; max-width: 75px; overflow: hidden;">
      <v-menu ref="menuRef" v-model="menuActive">
        <template #activator="{ props: menuProps }" >
          <v-btn class="glass-panel" v-bind="menuProps" icon="mdi-dots-vertical" size="small" @click.stop></v-btn>
        </template>
        <v-list class="glass-panel">
          <v-list-item v-if="entity?.canUpdate && entityPermission?.allowUpdate" @click.stop="$emit('edit', item)">
            <v-icon start>mdi-pencil</v-icon>
            <span>{{ $t('global.edit') }}</span>
          </v-list-item>
          <v-list-item v-else @click.stop="$emit('show', item)">
            <v-icon start>mdi-eye</v-icon>
            <span>{{ $t('global.show') }}</span>
          </v-list-item>
          <v-list-item v-if="entity?.canDelete && entityPermission?.allowDelete" @click.stop="$emit('delete', item)">
            <v-icon start>mdi-delete</v-icon>
            <span>{{ $t('global.delete') }}</span>
          </v-list-item>
          <v-list-item v-if="entityTemplates.some(t => t.options?.includes('isNavigation'))" @click.stop="navigateToAddress(item)">
            <v-icon start>mdi-navigation</v-icon>
            <span>{{ $t('global.navigate') }}</span>
          </v-list-item>
          <v-list-item @click.stop="menuActive = false">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.close') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
  </tr>
</template>

<script lang="ts" setup>

// #region Imports
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import { ref, watch } from 'vue';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import '@/assets/styles/SaplingTableRow.css';
import SaplingTableReference from '@/components/table/SaplingTableReference.vue';
import SaplingTableJson from '@/components/table/SaplingTableJson.vue';
import SaplingTableChip from '@/components/table/SaplingTableChip.vue';
import { formatValue } from '@/utils/saplingFormatUtil';
import { useSaplingTableRow } from '@/composables/table/useSaplingTableRow';
// #endregion

// #region Props and Emits
interface SaplingTableRowProps {
  item: SaplingGenericItem;
  columns: Array<EntityTemplate & { cellProps?: { class?: string } } | EntityTemplate>;
  index: number;
  selectedRow: number | null;
  selectedRows?: number[];
  multiSelect?: boolean;
  entityName: string,
  entity: EntityItem | null,
  entityPermission: AccumulatedPermission | null,
  entityTemplates: EntityTemplate[],
  showActions: boolean;
}
const props = defineProps<SaplingTableRowProps>();

defineEmits(['select-row', 'edit', 'delete', 'show']);
// #endregion

// #region Constants and Refs
const menuRef = ref();
const menuActive = ref(false);
// Dialog state for JSON popup (per cell)
// Helper to format links: ensures external links are not relative
function formatLink(value: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
// #endregion

// #region Composable
const { getHeaders, references, ensureReferenceData, navigateToAddress } = useSaplingTableRow(
  props.entityName, 
  props.entity, 
  props.entityPermission, 
  props.entityTemplates
);

// Watch for entityName change and reload reference data
watch(
  () => props.entityName,
  () => {
    props.columns.forEach(col => {
      if ('referenceName' in col && col.referenceName) {
        ensureReferenceData(col.referenceName);
      }
    });
  }
);
// #endregion

</script>