<template>
  <div v-if="multiSelect" class="multi-select-bar pa-3">
    <v-icon color="primary" class="mr-2">mdi-checkbox-multiple-marked</v-icon>
    <span>{{ selectedRows.length }} {{ $t('global.selected') }}</span>
    <!-- Desktop: Aktionen inline -->
    <template v-if="showActionsInline">
      <v-btn v-if="selectedRows.length" size="small" color="primary" variant="text" @click="clearSelection">
        <v-icon start>mdi-close</v-icon>
        {{ $t('global.clearSelection') }}
      </v-btn>
      <v-btn v-if="showActions" size="small" color="primary" variant="text" @click="selectAll">
        <v-icon start>mdi-select-all</v-icon>
        {{ $t('global.selectAll') }}
      </v-btn>
      <v-btn v-if="selectedRows.length && showActions" size="small" color="error" variant="text" @click="deleteAllSelected">
        <v-icon start>mdi-delete</v-icon>
        {{ $t('global.deleteAll') }}
      </v-btn>
    </template>
    <!-- Mobile: Aktionen im Menü -->
    <template v-else>
      <v-menu location="top right" offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
        </template>
        <v-list class="glass-panel">
          <v-list-item v-if="selectedRows.length" @click="clearSelection">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.clearSelection') }}</span>
          </v-list-item>
          <v-list-item v-if="showActions" @click="selectAll">
            <v-icon start>mdi-select-all</v-icon>
            <span>{{ $t('global.selectAll') }}</span>
          </v-list-item>
          <v-list-item v-if="selectedRows.length && showActions" @click="deleteAllSelected">
            <v-icon start>mdi-delete</v-icon>
            <span>{{ $t('global.deleteAll') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher';

defineProps<{
  multiSelect: boolean;
  selectedRows: number[];
  showActions: boolean;
}>();

// Responsive: showActionsInline wie im Footer
const showActionsInline = ref(true);
let windowWatcher: SaplingWindowWatcher;
onMounted(() => {
  windowWatcher = new SaplingWindowWatcher();
  windowWatcher.onChange((size) => {
    showActionsInline.value = size !== 'small';
  });
});

const emit = defineEmits(['clearSelection', 'deleteAllSelected', 'selectAll']);

function clearSelection() {
  emit('clearSelection');
}

function deleteAllSelected() {
  emit('deleteAllSelected');
}

function selectAll() {
  emit('selectAll');
}
</script>