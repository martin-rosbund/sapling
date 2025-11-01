<template>
  <div class="text-h2 font-weight-bold mt-4">{{ value }}</div>
</template>

<script lang="ts" setup>
// #region Imports
// Import required modules
import { defineProps } from 'vue';
// #endregion

// #region Props
// Define component props
const props = defineProps<{ value: string | number }>();
// #endregion
</script>
