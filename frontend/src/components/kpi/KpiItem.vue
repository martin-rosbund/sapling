<template>
  <div class="text-h2 font-weight-bold mt-4">{{ value }}</div>
</template>
<script lang="ts" setup>
import { defineProps } from 'vue';
const props = defineProps<{ value: string | number }>();
</script>
