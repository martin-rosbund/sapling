<template>
  <div :style="(cellStyle as any)">
    <span>{{ formattedValue }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import CookieService from '@/services/cookie.service'; // Import a service for managing cookies

const props = defineProps<{ value: number | string }>();

const min = 0;
const max = 100000;

const numericValue = computed(() => {
  const v = typeof props.value === 'string' ? parseFloat(props.value) : props.value;
  return isNaN(v) ? min : Math.min(Math.max(v, min), max);
});

const percent = computed(() => (numericValue.value - min) / (max - min));

const color = computed(() => {
  // Gradient from green (#4CAF50) to red (#F44336)
  const r1 = 76, g1 = 175, b1 = 80; // green
  const r2 = 244, g2 = 67, b2 = 54; // red
  const r = Math.round(r1 + (r2 - r1) * percent.value);
  const g = Math.round(g1 + (g2 - g1) * percent.value);
  const b = Math.round(b1 + (b2 - b1) * percent.value);
  return `rgb(${r},${g},${b})`;
});

const cellStyle = computed(() => ({
  background: color.value,
  color: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  minWidth: '80px',
  textAlign: 'right',
}));

const currentLanguage = ref(CookieService.get('language') || 'de');
const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    const lang = currentLanguage.value;
    const currency = lang === 'de' ? 'EUR' : 'USD';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    return props.value.toLocaleString(locale, { style: 'currency', currency });
  }
  return props.value;
});
</script>

<style scoped src="@/assets/styles/SaplingCellMoney.css"></style>
