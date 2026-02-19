<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': !props.multiSelect && selectedRow === index, 'multi-selected-row': props.multiSelect && selectedRows && selectedRows.includes(index) }"
    @mousedown="$emit('select-row', index)"
    @contextmenu.prevent="onContextMenu($event, item, index)"
    style="cursor: pointer;"
  >
    <!-- Multi-select checkbox cell -->
    <td v-if="multiSelect && columns[0]?.key === '__select'" class="select-cell" style="width: 40px; max-width: 40px; text-align: center;">
      <v-checkbox
        :model-value="selectedRows && selectedRows.includes(index)"
        :disabled="true"
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
            <v-btn size="small" @click.stop="openDialogForCol(col.key || '')" :rounded="false" :max-height="32" class="glass-panel">
              <v-icon class="pr-3" left>mdi-eye</v-icon>
              <span v-if="getCompactPanelTitle(col, item)" style="margin-left: 4px; white-space: pre;">
                {{ getCompactPanelTitle(col, item) }}
              </span>
            </v-btn>
            <SaplingEdit
              v-if="showDialogMap[col.key || '']"
              :model-value="showDialogMap[col.key || ''] ?? false"
              mode="readonly"
              :item="item[col.key || '']"
              :entity="references[col.referenceName || '']?.getState(col.referenceName || '').entity || null"
              :templates="references[col.referenceName || '']?.getState(col.referenceName || '').entityTemplates || []"
              @update:model-value="closeDialogForCol(col.key || '')"
            />
          </template>
          <template v-else-if="!item[col.key || '']?.isLoading">
            <div></div>
          </template>
          <template v-else>
            <v-skeleton-loader type="table-row" class="glass-panel" width="100%" />
          </template>
        </div>
        <SaplingCellBoolean v-else-if="typeof item[col.key || ''] === 'boolean'" :value="item[col.key || '']" />
        <SaplingCellColor v-else-if="'options' in col && col.options?.includes('isColor')" :value="item[col.key]" />
        <SaplingCellIcon v-else-if="'options' in col && col.options?.includes('isIcon')" :value="item[col.key]" />
        <SaplingCellPhone v-else-if="'options' in col && col.options?.includes('isPhone')" :value="item[col.key] != null ? String(item[col.key]) : ''">
          {{ formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type) }}
        </SaplingCellPhone>
        <SaplingCellMail v-else-if="'options' in col && col.options?.includes('isMail')" :value="item[col.key || '']">
          {{ formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type) }}
        </SaplingCellMail>
        <SaplingCellLink v-else-if="'options' in col && col.options?.includes('isLink')" :value="item[col.key || '']" :href="formatLink(item[col.key || ''])">
          {{ formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type) }}
        </SaplingCellLink>
        <SaplingTableJson v-else-if="col.type === 'JsonType'" :item="item" :template="col" :entityName="props.entityName" />
        <SaplingCellDefault v-else :value="formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type)" />
      </td>
    </template>
    <!-- Actions cell at the end of the row -->
    <td v-if="showActions && columns.some(c => c.key === '__actions')" class="actions-cell" style="width: 75px; max-width: 75px; overflow: hidden;">
      <v-menu ref="menuRef" v-model="menuActive">
        <template #activator="{ props: menuProps }" >
          <v-btn class="glass-panel" v-bind="menuProps" icon="mdi-dots-vertical" size="small" @click.stop :rounded="false" :max-height="32"></v-btn>
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
          <v-list-item v-if="entity?.canInsert && entityPermission?.allowInsert" @click.stop="$emit('copy', item)">
            <v-icon start>mdi-content-copy</v-icon>
            <span>{{ $t('global.copy') }}</span>
          </v-list-item>
          <v-list-item @click.stop="menuActive = false">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.close') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
    <!-- Context menu for right-click -->
    <SaplingTableContextMenu
      v-if="contextMenu.show"
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :item="contextMenu.item"
      :can-edit="!!(entity?.canUpdate && entityPermission?.allowUpdate)"
      :can-delete="!!(entity?.canDelete && entityPermission?.allowDelete)"
      :can-navigate="entityTemplates.some(t => t.options?.includes('isNavigation'))"
      @action="onContextMenuAction"
      @update:show="contextMenu.show = $event"
    />
  </tr>
</template>

<script lang="ts" setup>

// #region Imports
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import { ref, watch, reactive, onMounted, onUnmounted } from 'vue';
import SaplingTableContextMenu from '@/components/context/SaplingTableContextMenu.vue';

// Context menu state (singleton for the table row component)
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  item: null as SaplingGenericItem | null,
  index: -1,
});

function closeContextMenu() {
  contextMenu.show = false;
}

function onContextMenu(e: MouseEvent, item: SaplingGenericItem, idx: number) {
  e.preventDefault();
  // Close all other context menus globally
  window.dispatchEvent(new CustomEvent('sapling-contextmenu-open'));
  contextMenu.x = e.clientX;
  contextMenu.y = e.clientY;
  contextMenu.item = item;
  contextMenu.index = idx;
  contextMenu.show = true;
}

onMounted(() => {
  window.addEventListener('sapling-contextmenu-open', closeContextMenu);
});
onUnmounted(() => {
  window.removeEventListener('sapling-contextmenu-open', closeContextMenu);
});

function onContextMenuAction({ type, item }: { type: string, item: SaplingGenericItem }) {
  if (type === 'edit') {
    emit('edit', item);
  } else if (type === 'show') {
    emit('show', item);
  } else if (type === 'delete') {
    emit('delete', item);
  } else if (type === 'navigate') {
    navigateToAddress(item);
  } else if (type === 'copy') {
    emit('copy', item);
  }
  contextMenu.show = false;
}
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import SaplingEdit from '@/components/dialog/SaplingEdit.vue';
import SaplingTableJson from '@/components/table/SaplingTableJson.vue';
import SaplingTableChip from '@/components/table/SaplingTableChip.vue';
import { formatValue } from '@/utils/saplingFormatUtil';
import { useSaplingTableRow } from '@/composables/table/useSaplingTableRow';
import '@/assets/styles/SaplingTable.css';
import SaplingCellBoolean from './cells/SaplingCellBoolean.vue';
import SaplingCellColor from './cells/SaplingCellColor.vue';
import SaplingCellIcon from './cells/SaplingCellIcon.vue';
import SaplingCellPhone from './cells/SaplingCellPhone.vue';
import SaplingCellMail from './cells/SaplingCellMail.vue';
import SaplingCellLink from './cells/SaplingCellLink.vue';
import SaplingCellDefault from './cells/SaplingCellDefault.vue';

// #endregion

// #region Show Dialog State
// Map dialog state per m:1 cell (keyed by column key)
const showDialogMap = ref<Record<string, boolean>>({});
function openDialogForCol(colKey: string) {
  showDialogMap.value[colKey] = true;
}
function closeDialogForCol(colKey: string) {
  showDialogMap.value[colKey] = false;
}
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

const emit = defineEmits(['select-row', 'edit', 'delete', 'show', 'copy']);
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

// Gibt kompakten Panel-Title zurück
function getCompactPanelTitle(column: EntityTemplate, item: SaplingGenericItem): string {
  const refObj = item[column.key];
  if (!column?.referenceName || !refObj) return '';
  const headers = getHeaders(column.referenceName) || [];
  return headers
    .filter((x) => x.options?.includes('isShowInCompact'))
    .map((header) => formatValue(String(refObj?.[header.key] ?? ''), header.type))
    .filter((v: string) => v && v !== '-')
    .join(' | ');
}

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

<style scoped>
.v-input--density-default {
  --v-input-control-height: 38px;
  --v-input-padding-top: 16px;
}
</style>