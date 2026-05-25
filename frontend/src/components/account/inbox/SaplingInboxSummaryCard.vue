<template>
  <article
    class="sapling-metric-card sapling-metric-card--large sapling-metric-card--interactive glass-panel"
  >
    <div
      class="sapling-icon-tile"
      :class="`sapling-inbox-summary-card__icon--${card.tone}`"
    >
      <v-icon :icon="card.icon" />
    </div>
    <div class="sapling-metric-card__copy">
      <p>{{ $t(card.labelKey) }}</p>
      <strong>{{ card.count }}</strong>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { InboxSummaryCard } from '@/composables/account/useSaplingInbox'

defineProps<{
  card: InboxSummaryCard
}>()
</script>
