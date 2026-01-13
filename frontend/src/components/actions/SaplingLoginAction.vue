<template>
  <v-card-actions>
    <!-- Azure login button, displayed if enabled -->
    <v-btn v-if="IS_LOGIN_WITH_AZURE_ENABLED" icon="mdi-microsoft-azure" color="primary" @click="handleAzure" class="ma-2"/>
    <!-- Google login button, displayed if enabled -->
    <v-btn v-if="IS_LOGIN_WITH_GOOGLE_ENABLED" icon="mdi-google" color="primary" @click="handleGoogle" class="ma-2"/>
    <v-spacer />
    <!-- Login button to submit the form -->
    <v-btn color="primary" @click="handleLogin" class="ma-2">
      {{ $t('login.login') }}
    </v-btn>
  </v-card-actions>
</template>

<script setup lang="ts">
// Import constants to check if Azure and Google login are enabled
import { IS_LOGIN_WITH_AZURE_ENABLED, IS_LOGIN_WITH_GOOGLE_ENABLED } from '@/constants/project.constants';

// Define props for the actions
defineProps({
  handleAzure: Function,
  handleGoogle: Function,
  handleLogin: Function
});
</script>