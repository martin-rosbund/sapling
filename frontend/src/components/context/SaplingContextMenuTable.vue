<template>
  <v-menu
    v-model="menuVisible"
    :style="menuStyle"
    absolute
    content-class="sapling-context-menu__content"
    transition="slide-y-transition"
  >
    <v-list density="compact" elevation="8" min-width="200" class="glass-panel">
      <template v-if="Array.isArray(menuItems[0])">
        <template v-for="(group, groupIdx) in menuItems" :key="`group-menu-${groupIdx}`">
          <template v-if="Array.isArray(group)">
            <v-list-item
              v-for="menuItem in group.filter((mi: any) => mi && typeof mi === 'object' && 'type' in mi)"
              :key="`${menuItem.type}-${String(menuItem.scriptButton?.handle ?? menuItem.mailAction?.email ?? menuItem.titleKey ?? menuItem.title ?? '')}`"
              :prepend-icon="menuItem.icon"
              :title="resolveMenuItemTitle(menuItem.titleKey, menuItem.title)"
              @click="emitAction(menuItem.type, menuItem.scriptButton, menuItem.mailAction)"
            />
          </template>
          <template v-else>
            <v-list-item
              v-if="group && typeof group === 'object' && 'type' in group"
              :key="`${group.type}-${String(group.scriptButton?.handle ?? group.mailAction?.email ?? group.titleKey ?? group.title ?? '')}`"
              :prepend-icon="group.icon"
              :title="resolveMenuItemTitle(group.titleKey, group.title)"
              @click="emitAction(group.type, group.scriptButton, group.mailAction)"
            />
          </template>
          <v-divider v-if="groupIdx < menuItems.length - 1" :key="`divider-menu-${groupIdx}`" />
        </template>
      </template>
      <template v-else>
        <v-list-item
          v-for="menuItem in menuItems.filter(mi => mi && typeof mi === 'object' && 'type' in mi)"
          :key="`${menuItem.type}-${String(menuItem.scriptButton?.handle ?? menuItem.mailAction?.email ?? menuItem.titleKey ?? menuItem.title ?? '')}`"
          :prepend-icon="menuItem.icon"
          :title="resolveMenuItemTitle(menuItem.titleKey, menuItem.title)"
          @click="emitAction(menuItem.type, menuItem.scriptButton, menuItem.mailAction)"
        />
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
</script>
