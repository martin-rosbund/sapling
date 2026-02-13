<template>
  <v-icon start small class="mr-1">mdi-phone</v-icon>
  <a :href="`tel:${value}`">
    <slot />
  </a>
</template>

<script lang="ts" setup>
defineProps<{ value: string }>();
</script>
