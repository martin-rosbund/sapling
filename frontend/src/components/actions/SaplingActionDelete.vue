<template>
  <div class="sapling-account-dialog__footer">
    <v-card-actions class="sapling-account-dialog__actions">
      <v-btn text prepend-icon="mdi-close" @click="handleCancel">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
      <v-spacer/>
      <v-btn color="error" append-icon="mdi-delete" @click="handleConfirm">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.delete') }}</template>
      </v-btn>
    </v-card-actions>
  </div>
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

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>