<template>
  <section class="sapling-system-panel glass-panel">
    <div class="sapling-system-panel__header">
      <div>
        <p class="sapling-system-panel__eyebrow">{{ $t('system.filesystem') }}</p>
        <h2 class="sapling-system-panel__title">{{ $t('system.storageTitle') }}</h2>
      </div>
      <v-chip size="small" variant="outlined">
        {{ count }}
      </v-chip>
    </div>

    <div v-if="items.length" class="sapling-system-storage-grid">
      <article v-for="item in items" :key="item.key" class="sapling-system-storage-card">
        <div class="sapling-system-storage-card__header">
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.subtitle }}</p>
          </div>
          <v-chip size="small" variant="tonal" color="primary">
            {{ item.usageLabel }}
          </v-chip>
        </div>

        <v-progress-linear :model-value="item.usageProgress" color="amber" height="14" rounded />

        <div class="sapling-system-storage-card__stats">
          <div>
            <span>{{ $t('system.size') }}</span>
            <strong>{{ item.sizeLabel }}</strong>
          </div>
          <div>
            <span>{{ $t('system.used') }}</span>
            <strong>{{ item.usedLabel }}</strong>
          </div>
          <div>
            <span>{{ $t('system.diskFree') }}</span>
            <strong>{{ item.freeLabel }}</strong>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="sapling-system-empty-state">
      {{ emptyLabel }}
    </div>

    <v-alert v-if="error" type="error" density="comfortable" variant="tonal">
      {{ error }}
    </v-alert>
  </section>
</template>

<script lang="ts" setup>
defineProps<{
  count: number
  items: Array<{
    key: string
    title: string
    subtitle: string
    usageLabel: string
    usageProgress: number
    sizeLabel: string
    usedLabel: string
    freeLabel: string
  }>
  emptyLabel: string
  error?: string
}>()
</script>

<style scoped src="@/assets/styles/SaplingSystem.css"></style>
