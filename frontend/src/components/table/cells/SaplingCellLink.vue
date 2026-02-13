<template>
  <v-icon start small class="mr-1">mdi-link-variant</v-icon>
  <a :href="href" target="_blank" rel="noopener noreferrer">
    <slot />
  </a>
</template>

<script lang="ts" setup>
const props = defineProps<{ value: string; href: string }>();
</script>
