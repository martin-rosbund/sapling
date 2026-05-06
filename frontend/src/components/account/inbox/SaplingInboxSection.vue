<template>
  <article
    class="sapling-inbox-section glass-panel"
    :class="`sapling-inbox-section--${section.tone}`"
  >
    <div class="sapling-inbox-section__header">
      <div class="sapling-inbox-section__title-wrap">
        <div class="sapling-inbox-section__title-row">
          <div class="sapling-inbox-section__icon-wrap">
            <v-icon :icon="section.icon" size="18" />
          </div>
          <div>
            <h3 class="sapling-inbox-section__title">{{ $t(section.titleKey) }}</h3>
            <p class="sapling-inbox-section__subtitle">{{ $t(section.subtitleKey) }}</p>
          </div>
        </div>
      </div>
      <v-chip size="small" variant="tonal" :color="section.tone">
        {{ section.count }}
      </v-chip>
    </div>

    <div v-if="section.empty" class="sapling-inbox-section__empty">
      <v-icon :icon="section.icon" size="28" />
      <p>{{ $t(section.emptyKey) }}</p>
    </div>

    <div v-else class="sapling-inbox-entry-list">
      <SaplingInboxEntryCard
        v-for="entry in section.items"
        :key="entry.id"
        :entry="entry"
        @open="emit('open', $event)"
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
}>()
</script>
