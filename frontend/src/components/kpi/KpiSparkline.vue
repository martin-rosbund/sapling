<template>
  <div class="d-flex flex-column align-center">
  <svg width="100%" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <polyline
        :points="points"
        fill="none"
        stroke="#1976d2"
        stroke-width="2"
      />
      <circle v-if="pointsArr.length" :cx="pointsArr[pointsArr.length-1][0]" :cy="pointsArr[pointsArr.length-1][1]" r="3" fill="#1976d2" />
    </svg>
    <div class="text-caption mt-1">
      <span v-if="data.length" class="mr-2">{{ data[0].month }}/{{ data[0].year }}</span>
      <span v-if="data.length > 1">{{ data[data.length-1].month }}/{{ data[data.length-1].year }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { defineProps } from 'vue';
const props = defineProps<{ data: Array<{ month: number, year: number, value: number }> }>();
const width = 240; // viewBox Breite bleibt fixiert
const height = 80;
const pointsArr = computed(() => {
  if (!props.data.length) return [];
  const values = props.data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  // Punkte werden auf die viewBox-Breite verteilt
  return props.data.map((d, i) => [
    props.data.length > 1
      ? (i / (props.data.length - 1)) * (width - 10) + 5
      : width / 2,
    height - ((d.value - min) / range) * (height - 10) - 5
  ]);
});
const points = computed(() => pointsArr.value.map(p => p.join(",")).join(" "));
</script>
