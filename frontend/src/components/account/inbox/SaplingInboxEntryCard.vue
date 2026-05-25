<template>
  <article
    class="sapling-inbox-entry glass-panel"
    :class="{ 'sapling-inbox-entry--expanded': expanded }"
    :style="entryStyle(entry)"
    role="button"
    tabindex="0"
    @click="emit('open', entry)"
    @keyup.enter="emit('open', entry)"
    @keyup.space.prevent="emit('open', entry)"
  >
    <div class="sapling-row-between-md sapling-inbox-entry__meta-row">
      <div class="sapling-row-xs sapling-inbox-entry__kind">
        <span class="sapling-inbox-entry__kind-indicator"></span>
        <v-icon :icon="entry.icon" size="16" />
        <span>{{ $t(entry.kindLabelKey) }}</span>
      </div>
      <span class="sapling-inbox-entry__date">
        {{ entry.dateText || $t('inbox.unplanned') }}
      </span>
    </div>

    <h4 class="sapling-inbox-entry__title">{{ entry.title }}</h4>
    <p class="sapling-inbox-entry__description">
      {{ entry.description || $t('inbox.noDescription') }}
    </p>

    <div class="sapling-row-between-md sapling-inbox-entry__footer">
      <div class="sapling-chip-row sapling-inbox-entry__chips">
        <v-chip
          v-if="entry.contextLabel"
          size="x-small"
          variant="tonal"
          :color="entry.contextColor || 'primary'"
        >
          {{ entry.contextLabel }}
        </v-chip>
        <v-chip
          v-if="entry.statusLabel"
          size="x-small"
          variant="outlined"
          :color="entry.statusColor || 'primary'"
        >
          {{ entry.statusLabel }}
        </v-chip>
        <v-chip v-for="label in entry.supportLabels" :key="label" size="x-small" variant="text">
          {{ label }}
        </v-chip>
      </div>

      <div class="sapling-action-cluster sapling-inbox-entry__actions">
        <v-btn
          v-if="entry.dismissible"
          icon="mdi-close"
          variant="text"
          color="primary"
          size="small"
          :title="$t('global.close')"
          @click.stop="emit('dismiss', entry)"
        />
        <v-btn
          icon="mdi-arrow-top-right"
          variant="tonal"
          color="primary"
          size="small"
          :title="$t('inbox.openEntry')"
          @click.stop="emit('open', entry)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { InboxEntry } from '@/composables/account/useSaplingInbox'

const themeColorKeys = new Set([
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'error',
  'surface',
])

withDefaults(
  defineProps<{
    entry: InboxEntry
    expanded?: boolean
  }>(),
  {
    expanded: false,
  },
)

const emit = defineEmits<{
  (event: 'open', entry: InboxEntry): void
  (event: 'dismiss', entry: InboxEntry): void
}>()

function resolveCssColor(color?: string | null) {
  const normalizedColor = color?.trim()

  if (!normalizedColor) {
    return 'rgb(var(--v-theme-primary))'
  }

  if (themeColorKeys.has(normalizedColor)) {
    return `rgb(var(--v-theme-${normalizedColor}))`
  }

  return normalizedColor
}

function entryStyle(entry: InboxEntry) {
  const accentColor = entry.accentColor || entry.contextColor || entry.statusColor

  return {
    '--sapling-inbox-entry-accent-color': resolveCssColor(accentColor),
  }
}
</script>
