<template>
  <v-container class="sapling-partner-container sapling-fill-shell pa-0" density="compact" fluid>
    <section
      class="sapling-partner-layout"
      :class="{ 'sapling-partner-layout--panel-hidden': !showDesktopFilterPanel }"
    >
      <div class="sapling-partner-main-table-col d-flex flex-column pa-0">
        <v-card flat class="sapling-partner-main-table-card rounded-0 d-flex flex-column">
          <v-card-text class="sapling-partner-table-text pa-0 flex-grow-1">
            <div class="sapling-partner-table-scroll">
              <SaplingTable
                :items="items"
                :search="search ?? ''"
                :page="page"
                :items-per-page="itemsPerPage"
                :total-items="totalItems"
                :is-loading="isLoading"
                :sort-by="sortBy"
                :column-filters="columnFilters"
                :active-filter="activeFilter"
                :entity-handle="entity?.handle || ''"
                :entity="entity"
                :entity-permission="entityPermission"
                :entity-templates="entityTemplates || []"
                :show-actions="true"
                :multi-select="true"
                :show-favorite="true"
                :show-add="true"
                :show-side-panel-toggle="true"
                :side-panel-visible="isFilterPanelVisible"
                :side-panel-toggle-label="filterPanelToggleLabel"
                side-panel-toggle-icon="mdi-account-group-outline"
                :parent-filter="parentFilter"
                :table-key="tableKey"
                @update:search="onSearchUpdate"
                @update:page="onPageUpdate"
                @update:items-per-page="onItemsPerPageUpdate"
                @update:sort-by="onSortByUpdate"
                @update:column-filters="onColumnFiltersUpdate"
                @toggle-side-panel="toggleFilterPanel"
                @reload="loadData"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>

      <SaplingWorkFilterPanel
        v-if="!isMobileFilterLayout"
        :key="filterDrawerKey"
        v-show="showDesktopFilterPanel"
        class="sapling-partner-filter-panel"
        @update:selected-peoples="onSelectedPeoplesUpdate"
      />

      <v-dialog
        v-if="isMobileFilterLayout"
        v-model="mobileFilterDialogVisible"
        class="sapling-partner-filter-dialog"
        :max-width="SAPLING_DIALOG_MAX_WIDTH.md"
        scrollable
      >
        <div class="sapling-partner-filter-dialog__surface">
          <SaplingWorkFilterPanel
            :key="filterDrawerKey"
            class="sapling-partner-filter-panel sapling-partner-filter-panel--dialog"
            :show-close-action="true"
            :close-action-label="filterDialogCloseLabel"
            @close="mobileFilterDialogVisible = false"
            @update:selected-peoples="onSelectedPeoplesUpdate"
          />
        </div>
      </v-dialog>
    </section>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, defineAsyncComponent, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import SaplingWorkFilterPanel from '@/components/filter/SaplingWorkFilterPanel.vue'
import { useSaplingPartner } from '@/composables/partner/useSaplingPartner'
import { SAPLING_DIALOG_MAX_WIDTH } from '@/constants/dialog.constants'
// #endregion

const SaplingTable = defineAsyncComponent(() => import('@/components/table/SaplingTable.vue'))
const PARTNER_FILTER_DIALOG_BREAKPOINT = 1080

// #region Props
const props = defineProps<{ entityHandle: string }>()
const entityHandleRef = toRef(props, 'entityHandle')
// #endregion

const { t } = useI18n()
const { width } = useDisplay()

const isMobileFilterLayout = computed(() => width.value <= PARTNER_FILTER_DIALOG_BREAKPOINT)
const desktopFilterPanelVisible = ref(true)
const mobileFilterDialogVisible = ref(false)

const showDesktopFilterPanel = computed(
  () => !isMobileFilterLayout.value && desktopFilterPanelVisible.value,
)

const isFilterPanelVisible = computed(() =>
  isMobileFilterLayout.value ? mobileFilterDialogVisible.value : desktopFilterPanelVisible.value,
)

const filterPanelLabel = computed(() => {
  const peopleLabel = t('navigation.person')
  const companyLabel = t('navigation.company')

  return `${peopleLabel} & ${companyLabel}`
})

const filterPanelToggleLabel = computed(() =>
  isFilterPanelVisible.value
    ? `${filterPanelLabel.value} ausblenden`
    : `${filterPanelLabel.value} einblenden`,
)

const filterDialogCloseLabel = computed(() => t('global.close'))

watch(isMobileFilterLayout, (isMobile) => {
  if (!isMobile) {
    mobileFilterDialogVisible.value = false
  }
})

function toggleFilterPanel() {
  if (isMobileFilterLayout.value) {
    mobileFilterDialogVisible.value = !mobileFilterDialogVisible.value
    return
  }

  desktopFilterPanelVisible.value = !desktopFilterPanelVisible.value
}

// #region Composable
const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  columnFilters,
  activeFilter,
  entityTemplates,
  entity,
  entityPermission,
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
  parentFilter,
  tableKey,
  filterDrawerKey,
  onSelectedPeoplesUpdate,
} = useSaplingPartner(entityHandleRef)

// #endregion
</script>
