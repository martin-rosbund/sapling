<template>
  <v-card-actions class="d-flex justify-center">
    <v-btn color="default" @click="closeDialog" class="ma-2">
      {{ $t('global.cancel') }}
    </v-btn>
    <v-spacer/>
    <v-btn color="primary" @click="handlePasswordChange" class="ma-2">
      {{ $t('login.changePassword') }}
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
