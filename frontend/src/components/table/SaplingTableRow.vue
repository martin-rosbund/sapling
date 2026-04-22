<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    class="sapling-table-row"
    :class="{
      'selected-row': !props.multiSelect && selectedRow === index,
      'multi-selected-row': props.multiSelect && selectedRows && selectedRows.includes(index),
    }"
    @mousedown="onRowMouseDown($event, index)"
    @dblclick="onRowDoubleClick($event)"
    @contextmenu.prevent="openContextMenu($event, item, index)"
  >
    <!-- Multi-select checkbox cell -->
    <td
      v-if="multiSelect && columns[0]?.key === '__select'"
      class="select-cell sapling-table-row__select-cell"
    >
      <v-checkbox
        :model-value="selectedRows && selectedRows.includes(index)"
        hide-details
        density="compact"
        @update:model-value="toggleRowSelection(index)"
        @click.stop
      />
    </td>
    <!-- Render all other columns except actions -->
    <template v-for="col in columns" :key="col.key ?? ''">
      <td v-if="col.key !== '__actions' && col.key !== '__select'" :class="getColumnCellClass(col)">
        <div v-if="'options' in col && col.options?.includes('isChip')">
          <SaplingTableChip
            :item="item"
            :col="col"
            :reference-templates="getReferenceTemplates(col.referenceName)"
          />
        </div>
        <!-- Expansion panel for m:1 columns (object value) -->
        <div v-else-if="isReferenceColumn(col)">
          <template v-if="item[col.key || ''] && !isReferenceLoading(col)">
            <v-btn
              size="small"
              @click.stop="openDialogForCol(col.key || '')"
              :rounded="false"
              :max-height="32"
              class="glass-panel"
            >
              <v-icon class="pr-3" left>mdi-eye</v-icon>
              <span v-if="getCompactPanelTitle(col, item)" class="sapling-inline-pre">
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
        <SaplingCellBoolean
          v-else-if="typeof item[col.key || ''] === 'boolean'"
          :value="item[col.key || '']"
        />
        <SaplingCellColor
          v-else-if="'options' in col && col.options?.includes('isColor')"
          :value="item[col.key]"
        />
        <SaplingCellMoney
          v-else-if="'options' in col && col.options?.includes('isMoney')"
          :value="
            typeof item[col.key] !== 'undefined' && item[col.key] !== null ? item[col.key] : 0
          "
        />
        <SaplingCellIcon
          v-else-if="'options' in col && col.options?.includes('isIcon')"
          :value="item[col.key]"
        />
        <SaplingCellPercent
          v-else-if="'options' in col && col.options?.includes('isPercent')"
          :value="item[col.key]"
        />
        <SaplingCellPhone
          v-else-if="'options' in col && col.options?.includes('isPhone')"
          :value="item[col.key] != null ? String(item[col.key]) : ''"
          :entity-handle="props.entityHandle"
          :item-handle="item.handle"
          :item="item"
        >
          {{ formatPhoneNumber(item[col.key] != null ? String(item[col.key]) : '') }}
        </SaplingCellPhone>
        <SaplingCellMail
          v-else-if="'options' in col && col.options?.includes('isMail')"
          :value="item[col.key] != null ? String(item[col.key]) : ''"
          :entity-handle="props.entityHandle"
          :item-handle="item.handle"
          :item="item"
        >
          {{
            formatValue(
              item[col.key] != null ? String(item[col.key]) : '',
              (col as { type?: string }).type,
            )
          }}
        </SaplingCellMail>
        <SaplingCellLink
          v-else-if="'options' in col && col.options?.includes('isLink')"
          :value="item[col.key] != null ? String(item[col.key]) : ''"
          :href="formatLink(item[col.key] != null ? String(item[col.key]) : '')"
        >
          {{
            formatValue(
              item[col.key] != null ? String(item[col.key]) : '',
              (col as { type?: string }).type,
            )
          }}
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
        <SaplingTableJson
          v-else-if="col.type === 'JsonType'"
          :item="item"
          :template="col"
          :entityHandle="props.entityHandle"
        />
        <SaplingCellDefault
          v-else
          :value="
            formatValue(
              item[col.key] != null ? String(item[col.key]) : '',
              (col as { type?: string }).type,
            )
          "
        />
      </td>
    </template>
    <!-- Actions cell at the end of the row -->
    <td v-if="showActions && hasActionsColumn" class="actions-cell sapling-table-row__actions-cell">
      <v-menu v-model="menuActive">
        <template #activator="{ props: menuProps }">
          <v-btn
            class="glass-panel"
            v-bind="menuProps"
            icon="mdi-dots-vertical"
            size="small"
            @click.stop
            :rounded="false"
            :max-height="32"
          ></v-btn>
        </template>
        <v-list class="glass-panel">
          <v-list-item
            v-for="menuItem in rowMenuItems"
            :key="`${menuItem.type}-${menuItem.scriptButton?.handle ?? menuItem.titleKey ?? menuItem.title ?? ''}`"
            @click.stop="onMenuItemClick(menuItem)"
          >
            <v-icon start>{{ menuItem.icon }}</v-icon>
            <span>{{ menuItem.titleKey ? $t(menuItem.titleKey) : menuItem.title }}</span>
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
      :script-buttons="scriptButtons"
      :can-show-information="canShowInformation"
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
    <SaplingTableRowInformation
      v-if="showInformationDialog"
      :show="showInformationDialog"
      :item="informationDialogItem"
      :entityHandle="props.entityHandle"
      @close="closeInformationDialog"
      @saved="closeInformationDialog"
    />
  </tr>
</template>

<script lang="ts" setup>
// #region Imports
import type { SaplingContextMenuTableMenuItem } from '@/composables/context/useSaplingContextMenuTable'
import SaplingContextMenuTable from '@/components/context/SaplingContextMenuTable.vue'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingTableJson from '@/components/table/SaplingTableJson.vue'
import SaplingTableChip from '@/components/table/SaplingTableChip.vue'
import { useSaplingPhoneNumber } from '@/composables/phone/useSaplingPhoneNumber'
import { formatValue } from '@/utils/saplingFormatUtil'
import {
  useSaplingTableRow,
  type UseSaplingTableRowEmit,
  type UseSaplingTableRowProps,
} from '@/composables/table/useSaplingTableRow'
import SaplingCellBoolean from './cells/SaplingCellBoolean.vue'
import SaplingCellColor from './cells/SaplingCellColor.vue'
import SaplingCellMoney from './cells/SaplingCellMoney.vue'
import SaplingCellIcon from './cells/SaplingCellIcon.vue'
import SaplingCellPhone from './cells/SaplingCellPhone.vue'
import SaplingCellMail from './cells/SaplingCellMail.vue'
import SaplingCellLink from './cells/SaplingCellLink.vue'
import SaplingCellDefault from './cells/SaplingCellDefault.vue'
import SaplingCellPercent from './cells/SaplingCellPercent.vue'
import SaplingCellDate from './cells/SaplingCellDate.vue'
import SaplingCellTime from './cells/SaplingCellTime.vue'
import SaplingCellDateTime from './cells/SaplingCellDateTime.vue'
import SaplingTableRowInformation from './SaplingTableRowInformation.vue'
import SaplingTableRowUpload from './SaplingTableRowUpload.vue'
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingTableRowProps>()
const emit = defineEmits<UseSaplingTableRowEmit>()
// #endregion

// #region Composable
const {
  showUploadDialog,
  uploadDialogItem,
  showInformationDialog,
  informationDialogItem,
  menuActive,
  rowMenuItems,
  contextMenu,
  hasActionsColumn,
  canNavigate,
  canShowInformation,
  openContextMenu,
  onContextMenuAction,
  onRowMouseDown,
  onRowDoubleClick,
  openDialogForCol,
  closeDialogForCol,
  isDialogOpenForCol,
  closeMenu,
  requestEdit,
  requestShow,
  requestDelete,
  requestCopy,
  requestFavorite,
  requestScript,
  requestNavigate,
  requestTimeline,
  requestUploadDocument,
  requestShowDocuments,
  requestShowInformation,
  closeUploadDialog,
  closeInformationDialog,
  getReferenceTemplates,
  getReferenceEntity,
  isReferenceColumn,
  isReferenceLoading,
  getCompactPanelTitle,
  isDateTimeColumn,
  isDateColumn,
  isTimeColumn,
  getCellValue,
  toggleRowSelection,
  getColumnCellClass,
  formatLink,
} = useSaplingTableRow(props, emit)
const { formatPhoneNumber } = useSaplingPhoneNumber()

function onMenuItemClick(menuItem: SaplingContextMenuTableMenuItem) {
  switch (menuItem.type) {
    case 'edit':
      requestEdit(props.item)
      break
    case 'show':
      requestShow(props.item)
      break
    case 'delete':
      requestDelete(props.item)
      break
    case 'favorite':
      requestFavorite()
      break
    case 'copy':
      requestCopy(props.item)
      break
    case 'navigate':
      requestNavigate(props.item)
      break
    case 'timeline':
      requestTimeline(props.item)
      break
    case 'uploadDocument':
      requestUploadDocument(props.item)
      break
    case 'showDocuments':
      requestShowDocuments(props.item)
      break
    case 'showInformation':
      requestShowInformation(props.item)
      break
    case 'script':
      if (menuItem.scriptButton) {
        requestScript(props.item, menuItem.scriptButton)
      }
      break
    default:
      closeMenu()
      break
  }
}
// #endregion
</script>
