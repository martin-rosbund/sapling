<template>
  <div v-if="multiSelect" class="multi-select-bar pa-3">
    <v-icon color="primary" class="mr-2">mdi-checkbox-multiple-marked</v-icon>
    <span>{{ selectedCount }} {{ $t('global.selected') }}</span>

    <template v-if="showActionsInline">
      <v-btn v-if="canClearSelection" size="small" color="primary" variant="text" @click="clearSelection">
        <v-icon start>mdi-close</v-icon>
        {{ $t('global.clearSelection') }}
      </v-btn>
      <v-btn v-if="canSelectAll" size="small" color="primary" variant="text" @click="selectAll">
        <v-icon start>mdi-select-all</v-icon>
        {{ $t('global.selectAll') }}
      </v-btn>
      <v-btn v-if="canDeleteSelection" size="small" color="error" variant="text" @click="deleteAllSelected">
        <v-icon start>mdi-delete</v-icon>
        {{ $t('global.deleteAll') }}
      </v-btn>
    </template>

    <template v-else>
      <v-menu location="top right" offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
        </template>
        <v-list class="glass-panel">
          <v-list-item v-if="canClearSelection" @click="clearSelection">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.clearSelection') }}</span>
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
    </template>
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
  showActionsInline,
  selectedCount,
  canClearSelection,
  canSelectAll,
  canDeleteSelection,
  clearSelection,
  deleteAllSelected,
  selectAll,
} = useSaplingTableMultiSelect(props, emit);
</script>