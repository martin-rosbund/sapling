<template>
  <div class="sapling-dialog__footer">
    <v-card-actions class="sapling-dialog__actions">
      <v-btn v-if="IS_LOGIN_WITH_AZURE_ENABLED" icon="mdi-microsoft-azure" color="primary" @click="handleAzure" class="ma-2"/>
      <v-btn v-if="IS_LOGIN_WITH_GOOGLE_ENABLED" icon="mdi-google" color="primary" @click="handleGoogle" class="ma-2"/>
      <v-spacer />
      <v-btn color="primary" append-icon="mdi-login" @click="handleLogin" class="ma-2" :loading="isLoading" :disabled="isLoading">
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('login.login') }}
        </template>
      </v-btn>
    </v-card-actions>
  </div>
</template>

<script setup lang="ts">
// Import constants to check if Azure and Google login are enabled
import { IS_LOGIN_WITH_AZURE_ENABLED, IS_LOGIN_WITH_GOOGLE_ENABLED } from '@/constants/project.constants';

// Define props for the actions
defineProps({
  handleAzure: Function,
  handleGoogle: Function,
  handleLogin: Function,
  isLoading: Boolean,
});
</script>