<template>
  <v-card-actions>
    <!-- Cancel button to close the dialog without confirming -->
    <v-btn text prepend-icon="mdi-close" @click="handleCancel">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
    </v-btn>
    <v-spacer/>
    <!-- Confirm button to proceed with the deletion -->
    <v-btn color="error" append-icon="mdi-delete" @click="handleConfirm">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.delete') }}</template>
    </v-btn>
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