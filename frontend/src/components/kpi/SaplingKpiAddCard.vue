<template>
  <v-card outlined class="sapling-add-kpi-card d-flex align-center justify-center glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" style="min-height: 240px;" @click="handleOpen">
    <v-icon size="large" color="primary">mdi-plus-circle</v-icon>
    <v-btn color="primary" variant="text" class="ma-2">
      {{ $t('global.add') }}
    </v-btn>
  </v-card>
</template>

<script setup lang="ts">
// #region Imports
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
// #endregion

// #region Emits
const emit = defineEmits<{
  (event: 'open'): void;
}>();

function handleOpen() {
  emit('open');
}
// #endregion
</script>
