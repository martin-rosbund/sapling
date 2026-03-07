<template>
  <div v-if="multiSelect" class="multi-select-bar transparent pa-3 mb-2">
    <v-icon color="primary" class="mr-2">mdi-checkbox-multiple-marked</v-icon>
    <span>{{ selectedRows.length }} {{ $t('global.selected') }}</span>
    <v-btn v-if="selectedRows.length" size="small" color="primary" variant="text" @click="clearSelection">
      <v-icon start>mdi-close</v-icon>
      {{ $t('global.clearSelection') }}
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps<{
  multiSelect: boolean;
  selectedRows: number[];
}>();

const emit = defineEmits(['clearSelection']);

function clearSelection() {
  emit('clearSelection');
}
</script>

<style scoped>
.multi-select-bar {
  display: flex;
  align-self: center;
  height: 40px;
}
</style>
