<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': !props.multiSelect && selectedRow === index, 'multi-selected-row': props.multiSelect && selectedRows && selectedRows.includes(index) }"
    @mousedown="onRowMouseDown($event, index)"
    @contextmenu.prevent="openContextMenu($event, item, index)"
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
      <td v-if="col.key !== '__actions' && col.key !== '__select'" :class="getColumnCellClass(col)">
        <div v-if="'options' in col && col.options?.includes('isChip')">
          <SaplingTableChip :item="item" :col="col" :reference-templates="getReferenceTemplates(col.referenceName)" />
        </div>
        <!-- Expansion panel for m:1 columns (object value) -->
        <div v-else-if="isReferenceColumn(col)">
          <template v-if="item[col.key || ''] && !isReferenceLoading(col)">
            <v-btn size="small" @click.stop="openDialogForCol(col.key || '')" :rounded="false" :max-height="32" class="glass-panel">
              <v-icon class="pr-3" left>mdi-eye</v-icon>
              <span v-if="getCompactPanelTitle(col, item)" style="margin-left: 4px; white-space: pre;">
                {{ getCompactPanelTitle(col, item) }}
              </span>
            </v-btn>
            <SaplingDialogEdit
              v-if="isDialogOpenForCol(col.key || '')"
              :model-value="isDialogOpenForCol(col.key || '')"
              mode="readonly"
              :item="item[col.key || '']"
              :entity="getReferenceEntity(col.referenceName)"
              :templates="getReferenceTemplates(col.referenceName)"
              @update:model-value="closeDialogForCol(col.key || '')"
            />
          </template>
          <template v-else-if="!isReferenceLoading(col)">
            <div></div>
          </template>
          <template v-else>
            <v-skeleton-loader type="table-row" class="glass-panel" width="100%" />
          </template>
        </div>
        <SaplingCellBoolean v-else-if="typeof item[col.key || ''] === 'boolean'" :value="item[col.key || '']" />
        <SaplingCellColor v-else-if="'options' in col && col.options?.includes('isColor')" :value="item[col.key]" />
        <SaplingCellMoney v-else-if="'options' in col && col.options?.includes('isMoney')" :value="typeof item[col.key] !== 'undefined' && item[col.key] !== null ? item[col.key] : 0" />
        <SaplingCellIcon v-else-if="'options' in col && col.options?.includes('isIcon')" :value="item[col.key]" />
        <SaplingCellPercent v-else-if="'options' in col && col.options?.includes('isPercent')" :value="item[col.key]" />
        <SaplingCellPhone v-else-if="'options' in col && col.options?.includes('isPhone')" :value="item[col.key] != null ? String(item[col.key]) : ''">
          {{ formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type) }}
        </SaplingCellPhone>
        <SaplingCellMail v-else-if="'options' in col && col.options?.includes('isMail')" :value="item[col.key] != null ? String(item[col.key]) : ''">
          {{ formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type) }}
        </SaplingCellMail>
        <SaplingCellLink v-else-if="'options' in col && col.options?.includes('isLink')" :value="item[col.key] != null ? String(item[col.key]) : ''" :href="formatLink(item[col.key] != null ? String(item[col.key]) : '')">
          {{ formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type) }}
        </SaplingCellLink>
        <SaplingCellDateTime
          v-else-if="isDateTimeColumn(col)"
          :value="getCellValue(item, col.key)"
          :date-value="getCellValue(item, `${String(col.key ?? '')}_date`)"
          :time-value="getCellValue(item, `${String(col.key ?? '')}_time`)"
          :is-deadline="'options' in col && col.options?.includes('isDeadline')"
        />
        <SaplingCellDate
          v-else-if="isDateColumn(col)"
          :value="getCellValue(item, col.key)"
          :is-deadline="'options' in col && col.options?.includes('isDeadline')"
        />
        <SaplingCellTime v-else-if="isTimeColumn(col)" :value="getCellValue(item, col.key)" />
        <SaplingTableJson v-else-if="col.type === 'JsonType'" :item="item" :template="col" :entityHandle="props.entityHandle" />
        <SaplingCellDefault v-else :value="formatValue(item[col.key] != null ? String(item[col.key]) : '', (col as { type?: string }).type)" />
      </td>
    </template>
    <!-- Actions cell at the end of the row -->
    <td v-if="showActions && hasActionsColumn" class="actions-cell" style="width: 75px; max-width: 75px; overflow: hidden;">
      <v-menu v-model="menuActive">
        <template #activator="{ props: menuProps }" >
          <v-btn class="glass-panel" v-bind="menuProps" icon="mdi-dots-vertical" size="small" @click.stop :rounded="false" :max-height="32"></v-btn>
        </template>
        <v-list class="glass-panel">
          <v-list-item v-if="entityPermission?.allowUpdate" @click.stop="requestEdit(item)">
            <v-icon start>mdi-pencil</v-icon>
            <span>{{ $t('global.edit') }}</span>
          </v-list-item>
          <v-list-item v-else @click.stop="requestShow(item)">
            <v-icon start>mdi-eye</v-icon>
            <span>{{ $t('global.show') }}</span>
          </v-list-item>
          <v-list-item v-if="entityPermission?.allowDelete" @click.stop="requestDelete(item)">
            <v-icon start>mdi-delete</v-icon>
            <span>{{ $t('global.delete') }}</span>
          </v-list-item>
          <v-list-item @click.stop="requestFavorite()">
            <v-icon start>mdi-bookmark-plus-outline</v-icon>
            <span>{{ $t('global.saveAsFavorite') }}</span>
          </v-list-item>
          <v-list-item v-if="entityPermission?.allowInsert" @click.stop="requestCopy(item)">
            <v-icon start>mdi-content-copy</v-icon>
            <span>{{ $t('global.copy') }}</span>
          </v-list-item>
          <v-list-item v-if="canNavigate" @click.stop="requestNavigate(item)">
            <v-icon start>mdi-navigation</v-icon>
            <span>{{ $t('global.navigate') }}</span>
          </v-list-item>
          <v-list-item v-if="entityPermission?.allowInsert" @click.stop="requestUploadDocument(item)">
            <v-icon start>mdi-file-document-arrow-right</v-icon>
            <span>{{ $t('global.uploadDocument') }}</span>
          </v-list-item>
          <v-list-item v-if="entityPermission?.allowInsert" @click.stop="requestShowDocuments(item)">
            <v-icon start>mdi-file-document-multiple</v-icon>
            <span>{{ $t('global.showDocuments') }}</span>
          </v-list-item>
          <v-list-item @click.stop="closeMenu()">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.close') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
    <!-- Context menu for right-click -->
      <SaplingContextMenuTable
        v-if="contextMenu.show"
        :show="contextMenu.show"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :item="contextMenu.item"
        :entityPermission="entityPermission"
        :can-navigate="canNavigate"
        @action="onContextMenuAction"
        @update:show="contextMenu.show = $event"
      />
      <SaplingTableRowUpload
        v-if="showUploadDialog"
        :show="showUploadDialog"
        :item="uploadDialogItem"
        :entityHandle="props.entityHandle"
        @close="closeUploadDialog"
        @uploaded="closeUploadDialog"
      />
  </tr>
</template>

<script lang="ts" setup>
// #region Imports
import SaplingContextMenuTable from '@/components/context/SaplingContextMenuTable.vue';
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
import SaplingTableJson from '@/components/table/SaplingTableJson.vue';
import SaplingTableChip from '@/components/table/SaplingTableChip.vue';
import { formatValue } from '@/utils/saplingFormatUtil';
import {
  useSaplingTableRow,
  type UseSaplingTableRowEmit,
  type UseSaplingTableRowProps,
} from '@/composables/table/useSaplingTableRow';
import SaplingCellBoolean from './cells/SaplingCellBoolean.vue';
import SaplingCellColor from './cells/SaplingCellColor.vue';
import SaplingCellMoney from './cells/SaplingCellMoney.vue';
import SaplingCellIcon from './cells/SaplingCellIcon.vue';
import SaplingCellPhone from './cells/SaplingCellPhone.vue';
import SaplingCellMail from './cells/SaplingCellMail.vue';
import SaplingCellLink from './cells/SaplingCellLink.vue';
import SaplingCellDefault from './cells/SaplingCellDefault.vue';
import SaplingCellPercent from './cells/SaplingCellPercent.vue';
import SaplingCellDate from './cells/SaplingCellDate.vue';
import SaplingCellTime from './cells/SaplingCellTime.vue';
import SaplingCellDateTime from './cells/SaplingCellDateTime.vue';
import SaplingTableRowUpload from './SaplingTableRowUpload.vue';
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingTableRowProps>();
const emit = defineEmits<UseSaplingTableRowEmit>();
// #endregion

// #region Composable
const {
  showUploadDialog,
  uploadDialogItem,
  menuActive,
  contextMenu,
  hasActionsColumn,
  canNavigate,
  openContextMenu,
  onContextMenuAction,
  onRowMouseDown,
  openDialogForCol,
  closeDialogForCol,
  isDialogOpenForCol,
  closeMenu,
  requestEdit,
  requestShow,
  requestDelete,
  requestCopy,
  requestFavorite,
  requestNavigate,
  requestUploadDocument,
  requestShowDocuments,
  closeUploadDialog,
  getReferenceTemplates,
  getReferenceEntity,
  isReferenceColumn,
  isReferenceLoading,
  getCompactPanelTitle,
  isDateTimeColumn,
  isDateColumn,
  isTimeColumn,
  getCellValue,
  getColumnCellClass,
  formatLink,
} = useSaplingTableRow(props, emit);
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingTable.css"></style>