<template>
  <div class="sapling-table-filter-cell" @click.stop @mousedown.stop @keydown.stop>
    <v-menu v-model="menuOpen" :close-on-content-click="false" location="bottom start" offset="6">
      <template #activator="{ props: menuProps }">
        <button
          v-bind="menuProps"
          class="sapling-table-filter-trigger"
          :class="{ 'sapling-table-filter-trigger--active': hasValue }"
          type="button"
          @click.stop
        >
          <span class="sapling-table-filter-trigger__title">
            <v-icon size="x-small">{{ hasValue ? 'mdi-filter' : 'mdi-filter-outline' }}</v-icon>
            <span v-if="!isComponentLoading">{{ title }}</span>
            <v-skeleton-loader
              v-else
              class="sapling-table-filter-trigger__title-skeleton"
              type="text"
            />
          </span>
          <span
            v-if="isComponentLoading"
            class="sapling-table-filter-trigger__placeholder sapling-table-filter-trigger__placeholder--loading"
          >
            <v-skeleton-loader class="sapling-table-filter-trigger__skeleton" type="text" />
          </span>
          <span v-else-if="hasValue" class="sapling-table-filter-trigger__summary">
            <span v-if="isOperatorSelectable" class="sapling-table-filter-trigger__operator">
              {{ currentOperatorLabel }}
            </span>
            <span class="sapling-table-filter-trigger__value">{{ filterSummary }}</span>
          </span>
          <span v-else class="sapling-table-filter-trigger__placeholder">
            {{ $t(`filter.noFilter`) }}
          </span>
        </button>
      </template>

      <v-card class="sapling-table-filter-menu glass-panel" elevation="10">
        <div v-if="isComponentLoading" class="sapling-table-filter-menu__loading">
          <v-skeleton-loader type="heading, text" />
          <v-skeleton-loader type="article" />
          <v-skeleton-loader type="button, button" />
        </div>
        <template v-else>
          <div class="sapling-table-filter-menu__header">
            <div>
              <div class="sapling-table-filter-menu__eyebrow">{{ $t('filter.filter') }}</div>
              <div class="sapling-table-filter-menu__title">{{ title }}</div>
            </div>
            <v-btn icon variant="text" size="small" @click.stop="clearFilter">
              <v-icon size="small">mdi-filter-off-outline</v-icon>
            </v-btn>
          </div>

          <v-select
            v-if="isOperatorSelectable"
            :model-value="currentOperator"
            :items="operatorItems"
            item-title="title"
            item-value="value"
            :label="$t('filter.operator')"
            density="comfortable"
            variant="outlined"
            hide-details
            class="sapling-table-filter-menu__field"
            @update:model-value="updateOperator"
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps" :title="item.title" :subtitle="item.symbol" />
            </template>
          </v-select>

          <SaplingTableFilterBooleanValue
            v-if="filterVariant === 'boolean'"
            :model-value="singleValue"
            @update:model-value="updateSingleValue"
          />

          <SaplingTableFilterIconValue
            v-else-if="filterVariant === 'icon'"
            :model-value="singleValue"
            @update:model-value="updateSingleValue"
          />

          <SaplingTableFilterRelationValue
            v-else-if="filterVariant === 'relation'"
            :entity-handle="referenceEntityHandle"
            :model-value="relationItems"
            @update:model-value="updateRelationItems"
          />

          <SaplingTableFilterRangeValue
            v-else-if="filterVariant === 'range'"
            :start-value="rangeStartValue"
            :end-value="rangeEndValue"
            :input-type="inputType"
            :start-placeholder="rangeStartPlaceholder"
            :end-placeholder="rangeEndPlaceholder"
            :prefix="inputPrefix"
            :suffix="inputSuffix"
            :step="inputStep"
            @update:start-value="updateRangeStart"
            @update:end-value="updateRangeEnd"
          />

          <SaplingTableFilterSingleValue
            v-else
            :model-value="singleValue"
            :input-type="inputType"
            :label="singleValueLabel"
            :prefix="inputPrefix"
            :suffix="inputSuffix"
            :step="inputStep"
            :clearable="isClearableField"
            @update:model-value="updateSingleValue"
          />

          <div class="sapling-table-filter-menu__footer">
            <v-btn variant="text" size="small" @click.stop="clearFilter">
              {{ $t(`filter.reset`) }}
            </v-btn>
            <v-btn variant="text" size="small" @click.stop="emit('sort')">
              {{ $t(`filter.sort`) }}
            </v-btn>
          </div>
        </template>
      </v-card>
    </v-menu>

    <v-btn
      icon
      variant="text"
      size="x-small"
      class="sapling-table-filter-sort"
      @click.stop="emit('sort')"
    >
      <v-icon size="small">{{ sortIcon }}</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingTableColumnFilter } from '@/composables/table/useSaplingTableColumnFilter'
import SaplingTableFilterBooleanValue from './SaplingTableFilterBooleanValue.vue'
import SaplingTableFilterIconValue from './SaplingTableFilterIconValue.vue'
import SaplingTableFilterRelationValue from './SaplingTableFilterRelationValue.vue'
import SaplingTableFilterRangeValue from './SaplingTableFilterRangeValue.vue'
import SaplingTableFilterSingleValue from './SaplingTableFilterSingleValue.vue'
import type { ColumnFilterItem } from '@/entity/structure'
import type { SaplingTableColumnFilterProps } from '@/composables/table/useSaplingTableColumnFilter'

const props = defineProps<SaplingTableColumnFilterProps>()

const emit = defineEmits<{
  'update:filter': [value: ColumnFilterItem | null]
  sort: []
}>()

const {
  clearFilter,
  currentOperator,
  currentOperatorLabel,
  filterSummary,
  filterVariant,
  hasValue,
  inputPrefix,
  inputStep,
  inputSuffix,
  inputType,
  isClearableField,
  isComponentLoading,
  isOperatorSelectable,
  menuOpen,
  operatorItems,
  rangeEndPlaceholder,
  rangeEndValue,
  rangeStartPlaceholder,
  rangeStartValue,
  referenceEntityHandle,
  relationItems,
  singleValue,
  singleValueLabel,
  updateOperator,
  updateRangeEnd,
  updateRangeStart,
  updateRelationItems,
  updateSingleValue,
} = useSaplingTableColumnFilter(props, emit)
</script>
