<template>
  <div v-if="formattedValue" class="sapling-date-field">
    <v-icon size="14">mdi-calendar</v-icon>
    <span >{{ formattedValue }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { formatDateValue } from '@/utils/saplingFormatUtil';

const props = defineProps<{
  value: string | Date | null | undefined;
}>();

const formattedValue = computed(() => formatDateValue(props.value));
</script>

<style scoped src="@/assets/styles/SaplingTableDateCell.css"></style>