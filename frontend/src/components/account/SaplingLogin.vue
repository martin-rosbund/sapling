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
        <div class="sapling-dialog-shell">
          <SaplingDialogHero :eyebrow="$t('login.title')" :title="$t('login.title')" />

          <div class="sapling-login-dialog__body">
            <v-form class="sapling-dialog-form" @submit.prevent="handleLogin">
              <!-- Email input field -->
              <v-text-field :label="$t('login.username')" prepend-icon="mdi-account" type="email" v-model="email"/>
              <!-- Password input field -->
              <v-text-field :label="$t('login.password')" prepend-icon="mdi-lock" type="password" v-model="password"/>
              <!-- Checkbox to remember login, right aligned -->
              <v-checkbox v-model="rememberMe" :label="$t('login.rememberMe')" class="d-flex justify-end"/>
            </v-form>
          </div>

          <v-divider class="my-2"></v-divider>
          <SaplingActionLogin :handleAzure="handleAzure" :handleGoogle="handleGoogle" :handleLogin="handleLogin" :isLoading="isAuthenticating" />
        </div>
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
import { computed } from 'vue';
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

const emailPreview = computed(() => email.value || '-');
const passwordLength = computed(() => password.value.length);
//#endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>