<template>
  <SaplingSurface as="article" class="sapling-metric-card">
    <div class="sapling-icon-tile" :class="iconClass">
      <v-icon :icon="icon" />
    </div>
    <div class="sapling-metric-card__copy">
      <p>{{ label }}</p>
      <strong>{{ value }}</strong>
      <span>{{ detail }}</span>
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
}>()
</script>
