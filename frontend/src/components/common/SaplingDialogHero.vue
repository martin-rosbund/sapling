<template>
  <section
    v-bind="$attrs"
    class="sapling-dialog-hero"
    :class="{ 'sapling-dialog-hero--danger': variant === 'danger' }"
  >
    <div class="sapling-dialog-hero__copy" :class="{ 'sapling-dialog-hero__copy--loading': loading }">
      <template v-if="loading">
        <slot name="loading-copy">
          <v-skeleton-loader type="heading, text" />
        </slot>
      </template>
      <template v-else>
        <div v-if="eyebrow" class="sapling-dialog-hero__eyebrow">{{ eyebrow }}</div>
        <div class="sapling-dialog-hero__title-row">
          <component :is="titleTag" class="sapling-dialog-hero__title">{{ title }}</component>
          <slot name="title-trailing" />
        </div>
        <p v-if="subtitle" class="sapling-dialog-hero__subtitle">{{ subtitle }}</p>
      </template>
    </div>

    <div
      v-if="hasStats"
      class="sapling-dialog-hero__stats"
      :style="{ '--sapling-dialog-hero-stats-columns': String(statsColumns) }"
    >
      <template v-if="loading">
        <slot name="loading-stats">
          <v-skeleton-loader
            v-for="item in loadingStatsCount"
            :key="item"
            class="sapling-dialog-hero__loading-stat"
            type="article"
          />
        </slot>
      </template>
      <template v-else-if="stats.length">
        <div v-for="stat in stats" :key="stat.label" class="sapling-dialog-hero__stat">
          <span class="sapling-dialog-hero__stat-label">{{ stat.label }}</span>
          <strong class="sapling-dialog-hero__stat-value">{{ stat.value }}</strong>
        </div>
      </template>
      <slot v-else name="stats" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

defineOptions({
  inheritAttrs: false,
});

type SaplingDialogHeroStat = {
  label: string;
  value: string | number;
};

const props = withDefaults(defineProps<{
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  titleTag?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  loadingStatsCount?: number;
  stats?: SaplingDialogHeroStat[];
  statsColumns?: number;
}>(), {
  eyebrow: '',
  title: '',
  subtitle: '',
  titleTag: 'h2',
  variant: 'default',
  loading: false,
  loadingStatsCount: 0,
  stats: () => [],
  statsColumns: 2,
});

const slots = useSlots();

const hasStats = computed(() => {
  if (props.loading) {
    return props.loadingStatsCount > 0 || Boolean(slots['loading-stats']) || Boolean(slots.stats);
  }

  return props.stats.length > 0 || Boolean(slots.stats);
});
</script>

<style scoped src="@/assets/styles/SaplingHero.css"></style>