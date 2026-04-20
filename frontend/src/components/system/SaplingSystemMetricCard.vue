<template>
  <article class="sapling-system-metric glass-panel">
    <div class="sapling-system-metric__icon" :class="iconClass">
      <v-icon :icon="icon" />
    </div>
    <div class="sapling-system-metric__copy">
      <p>{{ label }}</p>
      <strong>{{ value }}</strong>
      <span>{{ detail }}</span>
    </div>
  </article>
</template>

<script lang="ts" setup>
defineProps<{
  icon: string
  iconClass?: string
  label: string
  value: string
  detail: string
}>()
</script>

<style scoped src="@/assets/styles/SaplingSystem.css"></style>
