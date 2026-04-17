<template>
  <div style="display: flex; align-items: center; gap: 8px; min-width: 80px">
    <v-progress-linear
      :model-value="progressValue"
      height="16"
      color="primary"
      rounded
      style="flex: 1; min-width: 60px"
      :max="100"
      :min="0"
      :show-value="false"
    />
    <span style="min-width: 32px; text-align: right">{{ progressValue }}%</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
const props = defineProps<{ value: number | null | undefined }>()

const progressValue = computed(() => {
  if (typeof props.value !== 'number') return 0
  if (props.value < 0) return 0
  if (props.value > 100) return 100
  return Math.round(props.value)
})
</script>
