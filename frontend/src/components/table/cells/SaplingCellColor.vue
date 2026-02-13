<template>
  <v-chip :color="value" small>{{ value }}</v-chip>
</template>

<script lang="ts" setup>
defineProps<{ value: string }>();
</script>
