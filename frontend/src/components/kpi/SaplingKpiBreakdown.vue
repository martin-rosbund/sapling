<template>
  <div class="sapling-kpi-widget sapling-kpi-breakdown">
    <v-skeleton-loader v-if="loading && !isLoaded" type="list-item-two-line, list-item-two-line, list-item-two-line" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <div v-else class="sapling-kpi-breakdown__items">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="sapling-kpi-breakdown__item"
        :class="{ 'sapling-kpi-breakdown__item--clickable': canOpenEntity }"
        @click="canOpenEntity ? openBreakdownItem(item.row) : undefined"
      >
        <div class="sapling-kpi-breakdown__row">
          <span class="sapling-kpi-breakdown__label">{{ item.label }}</span>
          <strong class="sapling-kpi-breakdown__value">{{ item.value }}</strong>
        </div>
        <div class="sapling-kpi-breakdown__bar">
          <span class="sapling-kpi-breakdown__fill" :style="{ width: `${item.share}%` }" />
        </div>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingKpiBreakdown } from '@/composables/kpi/useSaplingKpiBreakdown';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';

interface SaplingKpiBreakdownProps {
  kpi: KPIItem;
}

const props = defineProps<SaplingKpiBreakdownProps>();
const {
  items,
  loading,
  hasError,
  isLoaded,
  hasData,
  canOpenEntity,
  openBreakdownItem,
  loadKpiValue,
} = useSaplingKpiBreakdown(toRef(props, 'kpi'));

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded });
</script>

<style scoped src="@/assets/styles/SaplingKpiBreakdown.css"></style>