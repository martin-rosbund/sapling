<template>
  <div v-if="formattedValue" :class="['sapling-date-field', stateClass]">
    <v-icon size="14">mdi-calendar</v-icon>
    <span >{{ formattedValue }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { formatDateValue, getDateCellState } from '@/utils/saplingFormatUtil';

const props = defineProps<{
  value: string | Date | null | undefined;
  isDeadline?: boolean;
}>();

const formattedValue = computed(() => formatDateValue(props.value));
const stateClass = computed(() => `sapling-date-field--${props.isDeadline ? getDateCellState(props.value) : 'default'}`);
</script>

<style scoped src="@/assets/styles/SaplingTableDateCell.css"></style>