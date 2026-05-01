<template>
  <v-data-table-server
    :key="tableKey"
    density="compact"
    fixed-header
    height="100%"
    class="sapling-table"
    :headers="visibleHeaders"
    :items="items"
    :page="page"
    :items-per-page="itemsPerPage"
    :items-per-page-options="DEFAULT_PAGE_SIZE_OPTIONS"
    :items-length="totalItems"
    :loading="isLoading"
    :server-items-length="totalItems"
    :sort-by="sortBy"
    @update:page="emit('update:page', $event)"
    @update:items-per-page="emit('update:items-per-page', $event)"
    @update:sort-by="emit('update:sort-by', $event)"
  >
    <template #headers="{ columns, isSorted, getSortIcon, toggleSort }">
      <tr>
        <template v-for="column in columns" :key="String(column.key ?? column.title ?? '')">
          <th :class="getHeaderCellClasses(column)">
            <template v-if="column.key === '__actions'">
              <span></span>
            </template>
            <template v-else-if="column.key === '__select'">
              <span></span>
            </template>
            <template v-else-if="isDesktopColumnFilterable(column)">
              <div class="sapling-table-filter-shell">
                <SaplingTableColumnFilter
                  :column="column"
                  :filter-item="getColumnFilterItem(String(column.key ?? ''))"
                  :title="String(column.title ?? '')"
                  :loading="isHeaderTranslationLoading"
                  :operator-options="getDesktopFilterOperatorOptions(column)"
                  :sort-icon="isSorted(column) ? getSortIcon(column) : 'mdi-swap-vertical'"
                  @update:filter="
                    (value) =>
                      emit('update:column-filter', {
                        key: String(column.key ?? ''),
                        value,
                      })
                  "
                  @sort="toggleSort(column)"
                />
              </div>
            </template>
            <template v-else>
              <button class="sapling-table-header-button" type="button" @click="toggleSort(column)">
                <span v-if="!isHeaderTranslationLoading">{{ column.title }}</span>
                <v-skeleton-loader
                  v-else
                  class="sapling-table-header-skeleton"
                  type="text"
                  width="88"
                />
                <v-icon v-if="isSorted(column)" size="small">{{ getSortIcon(column) }}</v-icon>
              </button>
            </template>
          </th>
        </template>
      </tr>
    </template>

    <template #item="{ item, index }">
      <SaplingTableRow
        :item="item"
        :columns="visibleHeaders"
        :index="index"
        :is-selected="isRowSelected(index)"
        :multi-select="multiSelect"
        :entity="entity"
        :entity-permission="entityPermission"
        :entity-templates="entityTemplates"
        :entity-handle="entityHandle"
        :script-buttons="rowScriptButtons"
        :can-navigate="canNavigate"
        :can-show-information="canShowInformation"
        :show-actions="showActions"
        @select-row="emit('select-row', $event)"
        @delete="emit('delete', $event)"
        @edit="emit('edit', $event)"
        @show="emit('show', $event)"
        @copy="emit('copy', $event)"
        @script="emit('script', $event)"
        @navigate="emit('navigate', $event)"
        @timeline="emit('timeline', $event)"
        @upload-document="emit('upload-document', $event)"
        @show-documents="emit('show-documents', $event)"
        @show-information="emit('show-information', $event)"
        @open-context-menu="emit('open-context-menu', $event)"
      />
    </template>
  </v-data-table-server>
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  ColumnFilterOperator,
  EntityTemplate,
  SaplingTableHeaderItem,
  SortItem,
} from '@/entity/structure'
import type {
  SaplingTableRowContextMenuOpenPayload,
  UseSaplingTableRowEmit,
} from '@/composables/table/useSaplingTableRow'
import SaplingTableColumnFilter from './filter/SaplingTableColumnFilter.vue'

type FilterOperatorOption = { label: string; value: ColumnFilterOperator }
type TableColumnLike = Record<string, unknown> & { key?: string | null; title?: string | null }

type SaplingTableDesktopViewEmit = UseSaplingTableRowEmit & {
  (event: 'open-context-menu', value: SaplingTableRowContextMenuOpenPayload): void
  (event: 'update:page', value: number): void
  (event: 'update:items-per-page', value: number | string): void
  (event: 'update:sort-by', value: SortItem[]): void
  (event: 'update:column-filter', value: { key: string; value: ColumnFilterItem | null }): void
}

const SaplingTableRow = defineAsyncComponent(() => import('./SaplingTableRow.vue'))

const props = defineProps<{
  tableKey: string
  items: SaplingGenericItem[]
  totalItems: number
  itemsPerPage: number
  page: number
  isLoading: boolean
  sortBy: SortItem[]
  visibleHeaders: SaplingTableHeaderItem[]
  multiSelect?: boolean
  entity: EntityItem | null
  entityPermission: AccumulatedPermission | null
  entityTemplates: EntityTemplate[]
  entityHandle: string
  rowScriptButtons: ScriptButtonItem[]
  canNavigate: boolean
  canShowInformation: boolean
  showActions: boolean
  selectedRows: number[]
  selectedRow: number | null
  isHeaderTranslationLoading: boolean
  getColumnFilterItem: (columnKey: string) => ColumnFilterItem | null | undefined
  getFilterOperatorOptions: (column: SaplingTableHeaderItem) => FilterOperatorOption[]
  isColumnFilterable: (column: SaplingTableHeaderItem) => boolean
}>()

const emit = defineEmits<SaplingTableDesktopViewEmit>()

function getHeaderCellClasses(column: Record<string, unknown> & { key?: string | null }) {
  const key = String(column.key ?? '')

  return [
    'sapling-table-header-cell',
    key === '__select' ? 'sapling-table-header-cell--select-width' : '',
    key === '__actions' ? 'sapling-table-header-cell--actions-width' : '',
    key !== '__select' && key !== '__actions' ? 'sapling-table-header-cell--data' : '',
  ].filter(Boolean)
}

function isRowSelected(index: number) {
  return props.multiSelect ? props.selectedRows.includes(index) : props.selectedRow === index
}

function isDesktopColumnFilterable(column: TableColumnLike) {
  return props.isColumnFilterable(column as SaplingTableHeaderItem)
}

function getDesktopFilterOperatorOptions(column: TableColumnLike) {
  return props.getFilterOperatorOptions(column as SaplingTableHeaderItem)
}
</script>
