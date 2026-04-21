<template>
  <div v-if="formattedValue" :class="['sapling-date-field', stateClass]">
    <v-icon size="14">mdi-calendar-clock-outline</v-icon>
    <span>{{ formattedValue }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { formatDateTimeValue, getDateTimeCellState } from '@/utils/saplingFormatUtil'

const props = defineProps<{
  value: string | Date | null | undefined
  dateValue?: string | Date | null
  timeValue?: string | Date | null
  isDeadline?: boolean
}>()

const formattedValue = computed(() =>
  formatDateTimeValue(props.value, props.dateValue, props.timeValue),
)
const stateClass = computed(
  () =>
    `sapling-date-field--${props.isDeadline ? getDateTimeCellState(props.value, props.dateValue, props.timeValue) : 'default'}`,
)
</script>
