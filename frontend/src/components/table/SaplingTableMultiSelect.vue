<template>
  <div v-if="multiSelect" class="sapling-table-toolbar-selection">
    <v-icon color="primary" size="small">mdi-checkbox-multiple-marked</v-icon>
    <span class="sapling-table-toolbar-selection-count">{{ selectedCount }} {{ $t('global.selected') }}</span>

    <v-menu v-if="hasSelectionActions" location="bottom start">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          class="sapling-table-toolbar-menu-btn"
          icon="mdi-dots-vertical"
          variant="text"
          size="small"
          aria-label="Selection actions"
          title="Selection actions"
        />
      </template>
      <v-list class="glass-panel">
        <v-list-item v-if="canClearSelection" @click="clearSelection">
          <v-icon start>mdi-close</v-icon>
          <span>{{ $t('global.clearSelection') }}</span>
        </v-list-item>
        <v-list-item v-if="canExportSelection" @click="exportSelected">
          <v-icon start>mdi-download-multiple</v-icon>
          <span>{{ $t('global.exportSelected') }}</span>
        </v-list-item>
        <v-list-item v-if="canSelectAll" @click="selectAll">
          <v-icon start>mdi-select-all</v-icon>
          <span>{{ $t('global.selectAll') }}</span>
        </v-list-item>
        <v-list-item v-if="canDeleteSelection" @click="deleteAllSelected">
          <v-icon start>mdi-delete</v-icon>
          <span>{{ $t('global.deleteAll') }}</span>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script lang="ts" setup>
import {
  useSaplingTableMultiSelect,
  type UseSaplingTableMultiSelectEmit,
  type UseSaplingTableMultiSelectProps,
} from '@/composables/table/useSaplingTableMultiSelect';

const props = defineProps<UseSaplingTableMultiSelectProps>();
const emit = defineEmits<UseSaplingTableMultiSelectEmit>();

const {
  selectedCount,
  hasSelectionActions,
  canClearSelection,
  canExportSelection,
  canSelectAll,
  canDeleteSelection,
  clearSelection,
  deleteAllSelected,
  exportSelected,
  selectAll,
} = useSaplingTableMultiSelect(props, emit);
</script>