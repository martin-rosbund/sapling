<template>
  <ul class="sapling-help-dialog__list">
    <li
      v-for="entry in entries"
      :key="entry.id"
      class="sapling-help-dialog__row"
      :class="{ 'sapling-help-dialog__row--syntax': Boolean(entry.example) }"
    >
      <code v-if="entry.example" class="sapling-help-dialog__example">{{ entry.example }}</code>
      <v-icon v-else-if="entry.icon" size="20" class="sapling-help-dialog__row-icon">
        {{ entry.icon }}
      </v-icon>
      <div class="sapling-help-dialog__row-stack">
        <span class="sapling-help-dialog__row-label">{{ entry.label }}</span>
        <span v-if="entry.hint" class="sapling-help-dialog__row-hint">
          {{ entry.hint }}
        </span>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import type { HelpListEntry } from '@/components/system/help-dialog/helpDialog.types'

defineProps<{
  entries: HelpListEntry[]
}>()
</script>
