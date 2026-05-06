<template>
  <article class="sapling-inbox-summary-card glass-panel">
    <div
      class="sapling-inbox-summary-card__icon"
      :class="`sapling-inbox-summary-card__icon--${card.tone}`"
    >
      <v-icon :icon="card.icon" />
    </div>
    <div class="sapling-inbox-summary-card__content">
      <div class="sapling-inbox-summary-card__label">{{ $t(card.labelKey) }}</div>
      <div class="sapling-inbox-summary-card__count">{{ card.count }}</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { InboxSummaryCard } from '@/composables/account/useSaplingInbox'

defineProps<{
  card: InboxSummaryCard
}>()
</script>
