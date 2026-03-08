<template>
  <div v-if="multiSelect" class="multi-select-bar transparent pa-3 mb-2">
    <v-icon color="primary" class="mr-2">mdi-checkbox-multiple-marked</v-icon>
    <span>{{ selectedRows.length }} {{ $t('global.selected') }}</span>
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
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps<{
  multiSelect: boolean;
  selectedRows: number[];
  showActions: boolean;
}>();

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

<style scoped>
.multi-select-bar {
  display: flex;
  align-self: center;
  height: 40px;
}
</style>
