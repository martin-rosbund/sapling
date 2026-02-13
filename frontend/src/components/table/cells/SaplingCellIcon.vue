<template>
  <v-icon>{{ value }}</v-icon>
</template>

<script lang="ts" setup>
defineProps<{ value: string }>();
</script>
