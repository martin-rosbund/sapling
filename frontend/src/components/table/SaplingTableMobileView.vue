<template>
  <div class="sapling-table-mobile-shell">
    <div class="sapling-table-mobile-summary glass-panel">
      <div class="sapling-table-mobile-summary__header">
        <div class="sapling-table-mobile-summary__identity">
          <span class="sapling-table-mobile-summary__eyebrow">
            {{ entity?.title ?? entityHandle }}
          </span>
          <div class="sapling-table-mobile-summary__headline">
            <span class="sapling-table-mobile-summary__headline-value">
              {{ totalItems }}
            </span>
            <span class="sapling-table-mobile-summary__headline-copy">{{ $t('global.items') }}</span>
          </div>
        </div>

        <div class="sapling-table-mobile-summary__actions">
          <v-btn
            class="sapling-table-mobile-summary__toggle-btn"
            variant="flat"
            size="small"
            :title="$t('global.sortAndFilter')"
            :aria-label="$t('global.sortAndFilter')"
            @click="mobileControlsVisible = !mobileControlsVisible"
          >
            <span>{{ $t('global.sortAndFilter') }}</span>
            <v-icon size="small">
              {{ mobileControlsVisible ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </v-btn>
        </div>
      </div>
      <v-progress-linear v-if="isLoading" color="primary" indeterminate rounded />
    </div>

    <v-expand-transition>
      <div v-if="mobileControlsVisible" class="sapling-table-mobile-controls-shell">
        <div class="sapling-table-mobile-controls glass-panel">
          <div class="sapling-table-mobile-controls__section">
            <span class="sapling-table-mobile-controls__label">{{ $t('filter.sort') }}</span>
            <div class="sapling-table-mobile-controls__sorts">
              <v-btn
                v-for="column in sortableMobileHeaders"
                :key="`sort-${String(column.key ?? '')}`"
                class="sapling-table-mobile-controls__sort-btn"
                variant="text"
                size="small"
                @click="emit('toggle-column-sort', String(column.key ?? ''))"
              >
                <span v-if="!isHeaderTranslationLoading">{{ column.title }}</span>
                <v-skeleton-loader
                  v-else
                  class="sapling-table-header-skeleton"
                  type="text"
                  width="88"
                />
                <v-icon size="small">{{ getColumnSortIcon(String(column.key ?? '')) }}</v-icon>
              </v-btn>
            </div>
          </div>

          <div
            v-if="filterableMobileHeaders.length > 0"
            class="sapling-table-mobile-controls__section"
          >
            <span class="sapling-table-mobile-controls__label">{{ $t('filter.filter') }}</span>
            <div class="sapling-table-mobile-controls__filters">
              <SaplingTableColumnFilter
                v-for="column in filterableMobileHeaders"
                :key="`filter-${String(column.key ?? '')}`"
                :column="column"
                :filter-item="getColumnFilterItem(String(column.key ?? '')) ?? undefined"
                :title="String(column.title ?? '')"
                :loading="isHeaderTranslationLoading"
                :operator-options="getFilterOperatorOptions(column)"
                :sort-icon="getColumnSortIcon(String(column.key ?? ''))"
                @update:filter="
                  (value) =>
                    emit('update:column-filter', {
                      key: String(column.key ?? ''),
                      value,
                    })
                "
                @sort="emit('toggle-column-sort', String(column.key ?? ''))"
              />
            </div>
          </div>
        </div>
      </div>
    </v-expand-transition>

    <div v-if="items.length > 0" class="sapling-table-mobile-list">
      <SaplingTableMobileCard
        v-for="(item, index) in items"
        :key="String(item.handle ?? index)"
        :item="item"
        :columns="mobileCardHeaders"
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
      />
    </div>
    <div v-else-if="isLoading" class="sapling-table-mobile-list">
      <v-skeleton-loader
        v-for="skeletonIndex in 3"
        :key="`mobile-card-skeleton-${skeletonIndex}`"
        class="sapling-table-mobile-skeleton glass-panel"
        type="article"
      />
    </div>

    <section
      v-else-if="!isLoading"
      class="sapling-empty-state-panel sapling-table-mobile-empty-state glass-panel"
    >
      <v-icon size="48">mdi-table-search</v-icon>
      <span class="sapling-eyebrow">{{ entity?.title ?? entityHandle }}</span>
      <p>{{ $t('global.noData') }}</p>
    </section>

    <v-pagination
      v-if="totalItems > itemsPerPage"
      :model-value="page"
      :length="Math.max(1, Math.ceil(totalItems / itemsPerPage))"
      :total-visible="5"
      density="comfortable"
      rounded="circle"
      @update:model-value="emit('update:page', $event)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  ColumnFilterOperator,
  EntityTemplate,
  SaplingTableHeaderItem,
} from '@/entity/structure'
import type { UseSaplingTableRowEmit } from '@/composables/table/useSaplingTableRow'
import SaplingTableColumnFilter from './filter/SaplingTableColumnFilter.vue'

type FilterOperatorOption = { label: string; value: ColumnFilterOperator }

type SaplingTableMobileViewEmit = UseSaplingTableRowEmit & {
  (event: 'update:page', value: number): void
  (event: 'toggle-column-sort', value: string): void
  (event: 'update:column-filter', value: { key: string; value: ColumnFilterItem | null }): void
}

const SaplingTableMobileCard = defineAsyncComponent(() => import('./SaplingTableMobileCard.vue'))

const props = defineProps<{
  items: SaplingGenericItem[]
  totalItems: number
  itemsPerPage: number
  page: number
  isLoading: boolean
  search: string
  mobileCardHeaders: SaplingTableHeaderItem[]
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
  getColumnSortIcon: (columnKey: string) => string
  isColumnFilterable: (column: SaplingTableHeaderItem) => boolean
  getColumnFilterItem: (columnKey: string) => ColumnFilterItem | null | undefined
  getFilterOperatorOptions: (column: SaplingTableHeaderItem) => FilterOperatorOption[]
}>()

const emit = defineEmits<SaplingTableMobileViewEmit>()

const mobileControlsVisible = ref(false)

const sortableMobileHeaders = computed(() =>
  props.mobileCardHeaders.filter((column) => column.options?.includes('isValue')),
)
const filterableMobileHeaders = computed(() =>
  sortableMobileHeaders.value.filter((column) => props.isColumnFilterable(column)),
)

function isRowSelected(index: number): boolean {
  return props.multiSelect ? props.selectedRows.includes(index) : props.selectedRow === index
}
</script>
