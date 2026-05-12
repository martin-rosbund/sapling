<template>
  <v-menu
    v-model="menuVisible"
    :style="menuStyle"
    absolute
    content-class="sapling-context-menu__content"
    transition="slide-y-transition"
  >
    <v-list density="compact" elevation="8" min-width="200" class="glass-panel">
      <template v-for="(group, groupIdx) in menuItems" :key="`group-menu-${groupIdx}`">
        <v-list-item
          v-for="menuItem in getMenuGroupItems(group)"
          :key="`${menuItem.type}-${String(menuItem.scriptButton?.handle ?? menuItem.mailAction?.email ?? menuItem.titleKey ?? menuItem.title ?? '')}`"
          :prepend-icon="menuItem.icon"
          :title="resolveMenuItemTitle(menuItem.titleKey, menuItem.title)"
          @click="emitAction(menuItem.type, menuItem.scriptButton, menuItem.mailAction)"
        />
        <v-divider v-if="groupIdx < menuItems.length - 1" :key="`divider-menu-${groupIdx}`" />
      </template>
      <v-list-item prepend-icon="mdi-close" :title="$t('global.close')" @click="closeMenu" />
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  useSaplingContextMenuTable,
  type SaplingContextMenuTableActionPayload,
  type SaplingContextMenuTableMenuEntry,
  type SaplingContextMenuTableMenuItem,
  type SaplingContextMenuTableProps,
} from '@/composables/context/useSaplingContextMenuTable'

const props = defineProps<SaplingContextMenuTableProps>()

const emit = defineEmits<{
  (event: 'action', payload: SaplingContextMenuTableActionPayload): void
  (event: 'update:show', value: boolean): void
}>()
const { t, te } = useI18n()

const { menuVisible, menuStyle, menuItems, closeMenu, emitAction } = useSaplingContextMenuTable(
  props,
  emit,
)

function resolveMenuItemTitle(titleKey?: string, title?: string | null) {
  if (titleKey) {
    return t(titleKey)
  }

  if (!title) {
    return ''
  }

  return te(title) ? t(title) : title
}

function isMenuItem(
  value: SaplingContextMenuTableMenuEntry,
): value is SaplingContextMenuTableMenuItem {
  return !Array.isArray(value)
}

function getMenuGroupItems(
  group: SaplingContextMenuTableMenuEntry,
): SaplingContextMenuTableMenuItem[] {
  return isMenuItem(group) ? [group] : group
}
</script>
