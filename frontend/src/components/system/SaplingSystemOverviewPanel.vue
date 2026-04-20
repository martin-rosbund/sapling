<template>
  <article class="sapling-system-panel glass-panel">
    <div class="sapling-system-panel__header">
      <div>
        <p class="sapling-system-panel__eyebrow">{{ $t('system.overview') }}</p>
        <h2 class="sapling-system-panel__title">{{ $t('system.system') }}</h2>
      </div>
      <v-chip size="small" variant="outlined">
        {{ hostname }}
      </v-chip>
    </div>

    <div class="sapling-system-details-grid">
      <div v-for="item in details" :key="item.label" class="sapling-system-detail">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <v-alert v-if="error" type="error" density="comfortable" variant="tonal">
      {{ error }}
    </v-alert>
  </article>
</template>

<script lang="ts" setup>
defineProps<{
  hostname: string
  details: Array<{
    label: string
    value: string
  }>
  error?: string
}>()
</script>

<style scoped src="@/assets/styles/SaplingSystem.css"></style>
