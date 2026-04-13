<template>
  <div class="sapling-dialog-shell" :class="{ 'sapling-fill-shell': fillShell }">
    <slot name="hero" />

    <div v-if="$slots.body" :class="bodyClass">
      <slot name="body" />
    </div>

    <template v-if="$slots.actions">
      <slot name="actions" />
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  fillShell?: boolean;
  bodyClass?: string;
  showDivider?: boolean;
}>(), {
  fillShell: false,
  bodyClass: '',
  showDivider: true,
});
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>