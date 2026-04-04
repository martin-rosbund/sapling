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
        :key="menuItem.type"
        :prepend-icon="menuItem.icon"
        :title="$t(menuItem.titleKey)"
        @click="emitAction(menuItem.type)"
      >
      </v-list-item>
      <v-list-item prepend-icon="mdi-close" :title="$t('global.close')" @click="closeMenu">
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import { useSaplingContextMenuTable } from '@/composables/context/useSaplingContextMenuTable';
import type { SaplingGenericItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';

interface SaplingContextMenuTableProps {
  entityPermission: AccumulatedPermission | null;
  canNavigate: boolean;
  item: SaplingGenericItem | null;
  show: boolean;
  x: number;
  y: number;
}

type SaplingContextMenuTableAction =
  | 'copy'
  | 'delete'
  | 'edit'
  | 'favorite'
  | 'navigate'
  | 'show'
  | 'showDocuments'
  | 'uploadDocument';

const props = defineProps<SaplingContextMenuTableProps>();

const emit = defineEmits<{
  (event: 'action', payload: { type: SaplingContextMenuTableAction; item: SaplingGenericItem }): void;
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
