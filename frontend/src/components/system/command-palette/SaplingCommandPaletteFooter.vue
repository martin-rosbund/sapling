<template>
  <div class="sapling-command-palette__footer">
    <span class="sapling-command-palette__shortcut">
      <SaplingShortcutKeys :keys="navigationKeys" size="sm" />
      {{ t('global.commandPalette.navigate') }}
    </span>
    <span class="sapling-command-palette__shortcut">
      <SaplingShortcutKeys :keys="openKeys" size="sm" />
      {{ t('global.commandPalette.open') }}
    </span>
    <span class="sapling-command-palette__shortcut">
      <SaplingShortcutKeys :keys="closeKeys" size="sm" />
      {{ t('global.commandPalette.close') }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import SaplingShortcutKeys from '@/components/common/SaplingShortcutKeys.vue'

const { t } = useI18n()

const navigationKeys = ['\u2191', '\u2193']
const openKeys = ['\u21B5']
const closeKeys = ['Esc']
</script>
