<template>
  <v-icon start small class="mr-1">mdi-email</v-icon>
  <a :href="`mailto:${value}`">
    <slot />
  </a>
</template>

<script lang="ts" setup>
defineProps<{ value: string }>();
</script>
