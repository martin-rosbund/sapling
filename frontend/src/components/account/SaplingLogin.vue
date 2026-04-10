<template>
  <!-- Container for the login form, styled to center content both vertically and horizontally -->
  <v-container class="sapling-login-shell d-flex flex-column justify-center align-center" fluid>
    <!-- Snackbar queue to display error messages -->
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <!-- Card container for the login form -->
    <v-card v-tilt="TILT_DEFAULT_OPTIONS" class="glass-panel tilt-content sapling-dialog-small sapling-login-dialog" elevation="10">
      <template v-if="isLoading">
        <SaplingInstanceBooting />
      </template>
      <template v-else>
        <SaplingDialogShell body-class="sapling-login-dialog__body">
          <template #hero>
            <SaplingDialogHero eyebrow="Sapling" :title="$t('login.title')" />
          </template>

          <template #body>
            <v-form class="sapling-dialog-form" @submit.prevent="handleLogin">
              <v-text-field :label="$t('login.username')" prepend-icon="mdi-account" type="email" v-model="email"/>
              <v-text-field :label="$t('login.password')" prepend-icon="mdi-lock" type="password" v-model="password"/>
              <v-checkbox v-model="rememberMe" :label="$t('login.rememberMe')" class="d-flex justify-end"/>
            </v-form>
          </template>

          <template #actions>
            <SaplingActionLogin :handleAzure="handleAzure" :handleGoogle="handleGoogle" :handleLogin="handleLogin" :isLoading="isAuthenticating" />
          </template>
        </SaplingDialogShell>
      </template>
    </v-card>
    <!-- Password change dialog displayed after login if required -->
    <SaplingChangePassword
      v-model="showPasswordChange"
      :allow-cancel="!requirePasswordChange"
      @success="handlePasswordChangeSuccess"
    />
  </v-container>
</template>

<script setup lang="ts">
//#region Import
// Import the composable for handling login logic
import SaplingInstanceBooting from '@/components/account/SaplingInstanceBooting.vue';
import { useSaplingLogin } from '@/composables/account/useSaplingLogin';
// Import the password change dialog component
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue';
// Import the tilt constants for styling
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
// Import the extracted SaplingActionLogin component
import SaplingActionLogin from '@/components/actions/SaplingActionLogin.vue';
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue';
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue';
//#endregion

//#region Composable
// Destructure the properties and methods from the useSaplingLogin composable
const {
  email, // Reactive property for the email input
  password, // Reactive property for the password input
  rememberMe, // Reactive property for the remember me checkbox
  isLoading, // Reactive property indicating if the login process is loading
  isAuthenticating, // Reactive property indicating if the authentication process is ongoing
  messages, // Reactive property for error messages
  handleLogin, // Method to handle the login process
  handleAzure, // Method to handle Azure login
  handleGoogle, // Method to handle Google login
  showPasswordChange, // Reactive property to show the password change dialog
  requirePasswordChange,
  handlePasswordChangeSuccess // Method to handle successful password change
} = useSaplingLogin();
//#endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>