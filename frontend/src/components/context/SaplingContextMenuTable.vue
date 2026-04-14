<template>
  <v-menu
    v-model="menuVisible"
    :style="menuStyle"
    absolute
    transition="slide-y-transition"
  >
    <v-list density="compact" elevation="8" min-width="200" class="glass-panel">
      <v-list-item
        v-for="menuItem in menuItems"
        :key="`${menuItem.type}-${String(menuItem.scriptButton?.handle ?? menuItem.titleKey ?? menuItem.title ?? '')}`"
        :prepend-icon="menuItem.icon"
        :title="menuItem.titleKey ? $t(menuItem.titleKey) : (menuItem.title ?? '')"
        @click="emitAction(menuItem.type, menuItem.scriptButton)"
      >
      </v-list-item>
      <v-list-item prepend-icon="mdi-close" :title="$t('global.close')" @click="closeMenu">
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import {
  useSaplingContextMenuTable,
  type SaplingContextMenuTableActionPayload,
  type SaplingContextMenuTableProps,
} from '@/composables/context/useSaplingContextMenuTable';

const props = defineProps<SaplingContextMenuTableProps>();

const emit = defineEmits<{
  (event: 'action', payload: SaplingContextMenuTableActionPayload): void;
  (event: 'update:show', value: boolean): void;
}>();

const {
  menuVisible,
  menuStyle,
  menuItems,
  closeMenu,
  emitAction,
} = useSaplingContextMenuTable(props, emit);
</script>

<style scoped src="@/assets/styles/SaplingContextMenu.css"></style>
