<template>
  <v-menu
    v-model="menuVisible"
    :style="menuStyle"
    absolute
    content-class="sapling-context-menu__content"
    transition="slide-y-transition"
  >
    <SaplingRecordActionMenuList
      class="glass-panel"
      density="compact"
      elevation="8"
      min-width="200"
      :menu-items="menuItems"
      :show-close-item="true"
      :show-edit="props.showEdit"
      @select="(menuItem) => emitAction(menuItem.type, menuItem.scriptButton, menuItem.mailAction)"
      @close="closeMenu"
    />
  </v-menu>
</template>

<script lang="ts" setup>
import {
  useSaplingContextMenuTable,
  type SaplingContextMenuTableActionPayload,
  type SaplingContextMenuTableProps,
} from '@/composables/context/useSaplingContextMenuTable'
import SaplingRecordActionMenuList from '@/components/common/SaplingRecordActionMenuList.vue'

const props = withDefaults(defineProps<SaplingContextMenuTableProps>(), {
  showEdit: true,
})

const emit = defineEmits<{
  (event: 'action', payload: SaplingContextMenuTableActionPayload): void
  (event: 'update:show', value: boolean): void
}>()

const { menuVisible, menuStyle, menuItems, closeMenu, emitAction } = useSaplingContextMenuTable(
  props,
  emit,
)
</script>
