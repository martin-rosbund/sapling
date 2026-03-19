<template>
  <v-card-actions class="d-flex justify-center">
    <v-btn color="default" prepend-icon="mdi-close" @click="closeDialog" class="ma-2">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
    </v-btn>
    <v-spacer/>
    <v-btn color="primary" append-icon="mdi-lock-reset" @click="handlePasswordChange" class="ma-2">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('login.changePassword') }}</template>
    </v-btn>
  </v-card-actions>
</template>

<script setup lang="ts">
// Props for the actions component
// These props are passed from the parent component
defineProps({
  handlePasswordChange: Function,
  closeDialog: Function,
});
</script>
