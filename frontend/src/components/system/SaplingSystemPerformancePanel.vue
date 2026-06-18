<template>
  <SaplingSurface as="article" class="sapling-section-panel">
    <div class="sapling-section-header">
      <div>
        <p class="sapling-eyebrow">{{ $t('system.performance') }}</p>
        <h2 class="sapling-section-title">{{ title }}</h2>
      </div>
      <v-chip v-if="manufacturer" size="small" variant="tonal" color="primary">
        {{ manufacturer }}
      </v-chip>
    </div>

    <div class="sapling-system-performance">
      <div class="sapling-system-gauge">
        <div class="sapling-system-gauge__copy">
          <span>{{ cpuGaugeLabel }}</span>
          <v-skeleton-loader v-if="cpuGaugeLoading" type="text" width="72" />
          <strong v-else>{{ cpuGaugeValue }}</strong>
        </div>
        <v-progress-linear :model-value="cpuGaugeProgress" color="primary" height="16" rounded />
      </div>

      <div class="sapling-system-gauge">
        <div class="sapling-system-gauge__copy">
          <span>{{ memoryGaugeLabel }}</span>
          <v-skeleton-loader v-if="memoryGaugeLoading" type="text" width="72" />
          <strong v-else>{{ memoryGaugeValue }}</strong>
        </div>
        <v-progress-linear :model-value="memoryGaugeProgress" color="teal" height="16" rounded />
      </div>
    </div>

    <div class="sapling-detail-grid">
      <div v-for="item in details" :key="item.label" class="sapling-detail-card">
        <span>{{ item.label }}</span>
        <v-skeleton-loader v-if="item.loading" type="text" width="112" />
        <strong v-else>{{ item.value }}</strong>
      </div>
    </div>

    <v-alert v-if="error" type="error" density="comfortable" variant="tonal">
      {{ error }}
    </v-alert>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import SaplingSurface from '@/components/common/SaplingSurface.vue'

defineProps<{
  title: string
  manufacturer?: string
  cpuGaugeLabel: string
  cpuGaugeValue: string
  cpuGaugeLoading?: boolean
  cpuGaugeProgress: number
  memoryGaugeLabel: string
  memoryGaugeValue: string
  memoryGaugeLoading?: boolean
  memoryGaugeProgress: number
  details: Array<{
    label: string
    value: string
    loading?: boolean
  }>
  error?: string
}>()
</script>
