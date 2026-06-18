<template>
  <SaplingSurface as="article" class="sapling-metric-card">
    <div class="sapling-icon-tile" :class="iconClass">
      <v-icon :icon="icon" />
    </div>
    <div class="sapling-metric-card__copy">
      <p>{{ label }}</p>
      <v-skeleton-loader v-if="valueLoading" type="text" width="72" />
      <strong v-else>{{ value }}</strong>
      <v-skeleton-loader v-if="detailLoading" type="text" width="140" />
      <span v-else>{{ detail }}</span>
    </div>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import SaplingSurface from '@/components/common/SaplingSurface.vue'

defineProps<{
  icon: string
  iconClass?: string
  label: string
  value: string
  detail: string
  valueLoading?: boolean
  detailLoading?: boolean
}>()
</script>
