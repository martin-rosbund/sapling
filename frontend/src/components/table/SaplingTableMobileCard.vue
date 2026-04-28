<template>
  <article
    class="sapling-table-mobile-card glass-panel"
    :class="{
      'sapling-table-mobile-card--selected': isSelected,
      'sapling-table-mobile-card--with-controls': hasHeaderControls,
      'sapling-table-mobile-card--with-select': props.multiSelect,
      'sapling-table-mobile-card--with-actions': hasRowActions,
    }"
    @click="handleCardClick"
    @dblclick="onRowDoubleClick($event)"
  >
    <div v-if="hasHeaderControls" class="sapling-table-mobile-card__header">
      <div class="sapling-table-mobile-card__controls">
        <v-btn
          v-if="props.multiSelect"
          class="sapling-table-mobile-card__select-btn"
          :icon="isSelected ? 'mdi-check-circle' : 'mdi-checkbox-blank-circle-outline'"
          :color="isSelected ? 'primary' : undefined"
          variant="text"
          size="small"
          @click.stop="toggleRowSelection(props.index)"
        />

        <v-menu v-if="hasRowActions" v-model="menuActive">
          <template #activator="{ props: menuProps }">
            <v-btn
              class="sapling-table-mobile-card__menu-btn"
              v-bind="menuProps"
              icon="mdi-dots-horizontal"
              variant="text"
              size="small"
              @click.stop
            />
          </template>

          <v-list class="glass-panel sapling-table-mobile-card__menu-list">
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
      </div>
    </div>

    <div v-if="displayColumns.length > 0" class="sapling-table-mobile-card__grid">
      <section
        v-for="col in displayColumns"
        :key="String(col.key ?? '')"
        class="sapling-table-mobile-card__field"
      >
        <span class="sapling-table-mobile-card__field-label">{{ col.title }}</span>
        <div class="sapling-table-mobile-card__field-value">
          <div v-if="'options' in col && col.options?.includes('isChip')">
            <SaplingTableChip
              :item="item"
              :col="col"
              :reference-templates="getReferenceTemplates(col.referenceName)"
            />
          </div>
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
                <span v-if="getCompactPanelTitle(col.key || '')" class="sapling-inline-pre">
                  {{ getCompactPanelTitle(col.key || '') }}
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
              <span class="sapling-table-mobile-card__field-placeholder">-</span>
            </template>
            <template v-else>
              <v-skeleton-loader type="text" class="glass-panel" width="100%" />
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
        </div>
      </section>
    </div>
  </article>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { SaplingContextMenuTableMenuItem } from '@/composables/context/useSaplingContextMenuTable'
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

const props = defineProps<UseSaplingTableRowProps>()
const emit = defineEmits<UseSaplingTableRowEmit>()

const {
  menuActive,
  rowMenuItems,
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
  onRowDoubleClick,
  toggleRowSelection,
  getReferenceTemplates,
  getReferenceEntity,
  isReferenceColumn,
  isReferenceLoading,
  getCompactPanelTitle,
  isDateTimeColumn,
  isDateColumn,
  isTimeColumn,
  getCellValue,
  formatLink,
} = useSaplingTableRow(props, emit)
const { formatPhoneNumber } = useSaplingPhoneNumber()

const displayColumns = computed(() =>
  props.columns.filter((column) => column.key !== '__actions' && column.key !== '__select'),
)

const hasRowActions = computed(() => props.showActions && rowMenuItems.value.length > 0)

const hasHeaderControls = computed(() => props.multiSelect || hasRowActions.value)

const isSelected = computed(() => Boolean(props.isSelected))

function handleCardClick() {
  if (props.multiSelect) {
    return
  }

  emit('select-row', props.index)
}

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
</script>
