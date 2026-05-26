<template>
  <article
    class="sapling-attention-section sapling-inbox-section sapling-section-panel glass-panel"
    :class="[
      `sapling-attention-section--${section.tone}`,
      `sapling-inbox-section--${section.tone}`,
    ]"
  >
    <div class="sapling-section-header">
      <div class="sapling-attention-section__title-wrap sapling-inbox-section__title-wrap">
        <div
          class="sapling-row-md sapling-attention-section__title-row sapling-inbox-section__title-row"
        >
          <div class="sapling-icon-tile sapling-icon-tile--sm">
            <v-icon :icon="section.icon" size="18" />
          </div>
          <div>
            <h3 class="sapling-section-title">{{ $t(section.titleKey) }}</h3>
            <p class="sapling-section-subtitle">{{ $t(section.subtitleKey) }}</p>
          </div>
        </div>
      </div>
      <v-chip size="small" variant="tonal" :color="section.tone">
        {{ section.count }}
      </v-chip>
    </div>

    <div v-if="section.empty" class="sapling-empty-state-panel sapling-empty-state-panel--compact">
      <v-icon :icon="section.icon" size="28" />
      <p class="sapling-empty-state-panel__text">{{ $t(section.emptyKey) }}</p>
    </div>

    <div v-else class="sapling-scroll-list sapling-attention-card-list sapling-inbox-entry-list">
      <SaplingInboxEntryCard
        v-for="entry in section.items"
        :key="entry.id"
        :entry="entry"
        @open="emit('open', $event)"
        @dismiss="emit('dismiss', $event)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { InboxEntry, InboxSection } from '@/composables/account/useSaplingInbox'
import SaplingInboxEntryCard from '@/components/account/inbox/SaplingInboxEntryCard.vue'

defineProps<{
  section: InboxSection
}>()

const emit = defineEmits<{
  (event: 'open', entry: InboxEntry): void
  (event: 'dismiss', entry: InboxEntry): void
}>()
</script>
