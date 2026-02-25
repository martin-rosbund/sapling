<template>
  <v-chip :color="safeValue" small>{{ safeValue }}</v-chip>
</template>

<script lang="ts" setup>
const props = defineProps<{ value?: string }>();
// Fallback to empty string or a default color if value is undefined/null
const safeValue = props.value ?? '';
</script>
