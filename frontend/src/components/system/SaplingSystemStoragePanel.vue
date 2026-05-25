<template>
  <SaplingSurface as="section" class="sapling-section-panel">
    <div class="sapling-section-header">
      <div>
        <p class="sapling-eyebrow">{{ $t('system.filesystem') }}</p>
        <h2 class="sapling-section-title">{{ $t('system.storageTitle') }}</h2>
      </div>
      <v-chip size="small" variant="outlined">
        {{ count }}
      </v-chip>
    </div>

    <div v-if="items.length" class="sapling-system-storage-grid">
      <article v-for="item in items" :key="item.key" class="sapling-data-card">
        <div class="sapling-section-header">
          <div>
            <h3>{{ item.title }}</h3>
            <p class="sapling-label">{{ item.subtitle }}</p>
          </div>
          <v-chip size="small" variant="tonal" color="primary">
            {{ item.usageLabel }}
          </v-chip>
        </div>

        <v-progress-linear :model-value="item.usageProgress" color="amber" height="14" rounded />

        <div class="sapling-detail-grid">
          <div class="sapling-detail-card">
            <span>{{ $t('system.size') }}</span>
            <strong>{{ item.sizeLabel }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.used') }}</span>
            <strong>{{ item.usedLabel }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.diskFree') }}</span>
            <strong>{{ item.freeLabel }}</strong>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="sapling-empty-state-panel sapling-empty-state-panel--compact">
      {{ emptyLabel }}
    </div>

    <v-alert v-if="error" type="error" density="comfortable" variant="tonal">
      {{ error }}
    </v-alert>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import SaplingSurface from '@/components/common/SaplingSurface.vue'

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
