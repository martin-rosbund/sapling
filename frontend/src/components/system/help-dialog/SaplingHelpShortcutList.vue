<template>
  <ul class="sapling-help-dialog__list">
    <li v-for="entry in entries" :key="entry.id" class="sapling-help-dialog__row">
      <SaplingShortcutKeys :keys="entry.keys" class="sapling-help-dialog__keys" />
      <span class="sapling-help-dialog__row-label">{{ entry.label }}</span>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import SaplingShortcutKeys from '@/components/common/SaplingShortcutKeys.vue'
import type { HelpShortcutEntry } from '@/components/system/help-dialog/helpDialog.types'

defineProps<{
  entries: HelpShortcutEntry[]
}>()
</script>
