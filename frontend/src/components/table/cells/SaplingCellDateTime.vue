<template>
  <div v-if="formattedValue" class="sapling-date-field">
    <v-icon size="14">mdi-calendar-clock-outline</v-icon>
    <span>{{ formattedValue }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { formatDateTimeValue } from '@/utils/saplingFormatUtil';

const props = defineProps<{
  value: string | Date | null | undefined;
  dateValue?: string | Date | null;
  timeValue?: string | Date | null;
}>();

const formattedValue = computed(() => formatDateTimeValue(props.value, props.dateValue, props.timeValue));
</script>

<style scoped src="@/assets/styles/SaplingTableDateCell.css"></style>