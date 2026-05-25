<template>
  <SaplingSurface as="section" class="sapling-section-panel">
    <div class="sapling-section-header">
      <div>
        <p class="sapling-eyebrow">{{ $t('system.network') }}</p>
        <h2 class="sapling-section-title">{{ $t('system.networkTitle') }}</h2>
      </div>
      <v-chip size="small" variant="outlined">
        {{ activeInterfaceCount }} {{ $t('system.activeInterfaces') }}
      </v-chip>
    </div>

    <div v-if="items.length" class="sapling-system-network-grid">
      <article v-for="item in items" :key="item.key" class="sapling-data-card">
        <div class="sapling-section-header">
          <div>
            <h3>{{ item.title }}</h3>
            <p class="sapling-label">{{ item.subtitle }}</p>
          </div>
          <div class="sapling-system-network-card__chips">
            <v-chip
              size="small"
              :color="item.isActive ? 'success' : 'default'"
              :variant="item.isActive ? 'tonal' : 'outlined'"
            >
              {{ item.subtitle }}
            </v-chip>
            <v-chip v-if="item.incidentCount > 0" size="small" color="warning" variant="tonal">
              {{ item.incidentCount }} {{ $t('system.incidents') }}
            </v-chip>
          </div>
        </div>

        <div class="sapling-detail-grid">
          <div class="sapling-detail-card">
            <span>{{ $t('system.received') }}</span>
            <strong>{{ item.receivedLabel }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.sent') }}</span>
            <strong>{{ item.sentLabel }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.receivedPerSec') }}</span>
            <strong>{{ item.receivedRateLabel }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.sentPerSec') }}</span>
            <strong>{{ item.sentRateLabel }}</strong>
          </div>
        </div>

        <div class="sapling-detail-grid">
          <div class="sapling-detail-card">
            <span>{{ $t('system.ping') }}</span>
            <strong>{{ item.pingLabel }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.errors') }}</span>
            <strong>{{ item.errorCount }}</strong>
          </div>
          <div class="sapling-detail-card">
            <span>{{ $t('system.drops') }}</span>
            <strong>{{ item.dropCount }}</strong>
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
  activeInterfaceCount: number
  items: Array<{
    key: string
    title: string
    subtitle: string
    isActive: boolean
    incidentCount: number
    receivedLabel: string
    sentLabel: string
    receivedRateLabel: string
    sentRateLabel: string
    pingLabel: string
    errorCount: number
    dropCount: number
  }>
  emptyLabel: string
  error?: string
}>()
</script>
