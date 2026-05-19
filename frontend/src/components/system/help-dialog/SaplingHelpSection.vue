<template>
  <section class="sapling-help-dialog__section">
    <h3 class="sapling-help-dialog__section-title">{{ title }}</h3>
    <p v-if="intro" class="sapling-help-dialog__section-intro">{{ intro }}</p>
    <slot />
  </section>
</template>

<script lang="ts" setup>
defineProps<{
  title: string
  intro?: string
}>()
</script>
