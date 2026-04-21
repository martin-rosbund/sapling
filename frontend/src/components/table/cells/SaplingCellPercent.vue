<template>
  <div class="sapling-cell-meter">
    <v-progress-linear
      :model-value="progressValue"
      height="16"
      color="primary"
      rounded
      class="sapling-cell-meter__progress"
      :max="100"
      :min="0"
      :show-value="false"
    />
    <span class="sapling-cell-meter__value">{{ progressValue }}%</span>
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
