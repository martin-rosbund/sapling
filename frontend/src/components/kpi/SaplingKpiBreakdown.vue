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

    <div v-else class="sapling-kpi-breakdown__content">
      <div v-if="leadItem" class="sapling-kpi-breakdown__hero">
        <div class="sapling-kpi-breakdown__hero-copy">
          <span class="sapling-kpi-breakdown__eyebrow">Leading segment</span>
          <h2 class="sapling-kpi-breakdown__hero-title">{{ leadItem.label }}</h2>
          <p class="sapling-kpi-breakdown__hero-meta">{{ leadShareLabel }} • {{ categoryCountLabel }}</p>
        </div>

        <div class="sapling-kpi-breakdown__hero-stat">
          <strong class="sapling-kpi-breakdown__hero-value">{{ leadItem.value }}</strong>
          <span class="sapling-kpi-breakdown__hero-caption">{{ spreadLabel }}</span>
        </div>
      </div>

      <div class="sapling-kpi-breakdown__summary">
        <div class="sapling-kpi-breakdown__summary-item">
          <span class="sapling-kpi-breakdown__summary-label">Total</span>
          <strong>{{ totalValue }}</strong>
        </div>
        <div class="sapling-kpi-breakdown__summary-item">
          <span class="sapling-kpi-breakdown__summary-label">Segments</span>
          <strong>{{ items.length }}</strong>
        </div>
      </div>

      <div class="sapling-kpi-breakdown__items">
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
            <div class="sapling-kpi-breakdown__metric">
              <strong class="sapling-kpi-breakdown__value">{{ item.value }}</strong>
              <span class="sapling-kpi-breakdown__share">{{ item.share }}%</span>
            </div>
          </div>
          <div class="sapling-kpi-breakdown__bar">
            <span class="sapling-kpi-breakdown__fill" :style="{ width: `${item.share}%` }" />
          </div>
        </button>
      </div>
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
  totalValue,
  leadItem,
  leadShareLabel,
  categoryCountLabel,
  spreadLabel,
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