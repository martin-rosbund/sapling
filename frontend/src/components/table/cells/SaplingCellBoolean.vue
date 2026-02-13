<template>
  <v-checkbox :model-value="value" :disabled="true" hide-details />
</template>

<script lang="ts" setup>
defineProps<{ value: boolean }>();
</script>
