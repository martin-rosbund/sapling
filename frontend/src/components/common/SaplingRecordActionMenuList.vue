<template>
  <v-list class="sapling-record-action-menu-list glass-panel">
    <template v-for="(group, groupIdx) in visibleMenuItems" :key="`group-${groupIdx}`">
      <v-list-item
        v-for="(menuItem, itemIdx) in group"
        :key="getMenuItemKey(menuItem, groupIdx, itemIdx)"
        :prepend-icon="menuItem.icon"
        :title="resolveMenuItemTitle(menuItem)"
        @click="onSelect($event, menuItem)"
      />
      <v-divider v-if="groupIdx < visibleMenuItems.length - 1" :key="`divider-${groupIdx}`" />
    </template>

    <v-list-item
      v-if="showCloseItem"
      prepend-icon="mdi-close"
      :title="$t('global.close')"
      @click="onClose"
    />
  </v-list>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  SaplingContextMenuTableMenuEntry,
  SaplingContextMenuTableMenuItem,
} from '@/composables/context/useSaplingContextMenuTable'

const props = withDefaults(
  defineProps<{
    menuItems: SaplingContextMenuTableMenuEntry[]
    showCloseItem?: boolean
    showEdit?: boolean
  }>(),
  {
    showCloseItem: false,
    showEdit: true,
  },
)

const emit = defineEmits<{
  select: [menuItem: SaplingContextMenuTableMenuItem]
  close: []
}>()

const { t, te } = useI18n()

const visibleMenuItems = computed<SaplingContextMenuTableMenuItem[][]>(() =>
  props.menuItems
    .map((group) => (Array.isArray(group) ? group : [group]))
    .map((group) =>
      group.filter(
        (menuItem) => props.showEdit !== false || !['edit', 'show'].includes(menuItem.type),
      ),
    )
    .filter((group) => group.length > 0),
)

function resolveMenuItemTitle(menuItem: SaplingContextMenuTableMenuItem): string {
  if (menuItem.titleKey) {
    return t(menuItem.titleKey)
  }

  if (!menuItem.title) {
    return ''
  }

  return te(menuItem.title) ? t(menuItem.title) : menuItem.title
}

function getMenuItemKey(
  menuItem: SaplingContextMenuTableMenuItem,
  groupIdx: number,
  itemIdx: number,
): string {
  return `${groupIdx}-${itemIdx}-${menuItem.type}-${String(
    menuItem.scriptButton?.handle ??
      menuItem.scriptButton?.name ??
      menuItem.mailAction?.email ??
      menuItem.titleKey ??
      menuItem.title ??
      '',
  )}`
}

function onSelect(
  event: MouseEvent | KeyboardEvent,
  menuItem: SaplingContextMenuTableMenuItem,
): void {
  event.stopPropagation()
  emit('select', menuItem)
}

function onClose(event: MouseEvent | KeyboardEvent): void {
  event.stopPropagation()
  emit('close')
}
</script>
