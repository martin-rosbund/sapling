<template>
  <v-card-actions>
    <v-btn text @click="closeDialog">{{ $t('global.close') }}</v-btn>
    <v-spacer/>
  </v-card-actions>
</template>

<script setup lang="ts">
// Define the emitted events for the component
const emit = defineEmits(['close']);

// Method to close the dialog
function closeDialog() {
  emit('close');
}
</script>
