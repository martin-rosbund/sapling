<template>
  <v-card-actions>
    <v-spacer />
    <!-- Cancel button to close the dialog without confirming -->
    <v-btn text @click="handleCancel">{{ $t('global.cancel') }}</v-btn>
    <!-- Confirm button to proceed with the deletion -->
    <v-btn color="error" @click="handleConfirm">{{ $t('global.delete') }}</v-btn>
  </v-card-actions>
</template>

<script lang="ts" setup>
//#region Props and Emits
// Define the props for the component
defineProps<{
  handleCancel: () => void; // Method to handle cancel action
  handleConfirm: () => void; // Method to handle confirm action
}>();
//#endregion
</script>