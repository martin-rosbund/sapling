<template>
  <!-- Container for the login form, styled to center content both vertically and horizontally -->
  <v-container class="d-flex justify-center align-center">
    <!-- Snackbar queue to display error messages -->
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <!-- Card container for the login form -->
    <v-card v-tilt="TILT_DEFAULT_OPTIONS" class="pa-6 glass-panel tilt-content sapling-dialog-small" elevation="10">
      <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto transparent sapling-skeleton-fullheight"
        elevation="12"
        type="article, text, actions"/>
      <template v-else>
        <!-- Title of the login form -->
        <v-card-title class="text-h5 text-center tilt-element">
          {{ $t('login.title') }}
        </v-card-title>
        <!-- Login form with fields for email and password -->
        <v-card-text>
          <v-form @submit.prevent="handleLogin">
            <!-- Email input field -->
            <v-text-field
              class=" tilt-element"
              :label="$t('login.username')"
              prepend-icon="mdi-account"
              type="email"
              v-model="email"
            ></v-text-field>
            <!-- Password input field -->
            <v-text-field
              class=" tilt-element"
              :label="$t('login.password')"
              prepend-icon="mdi-lock"
              type="password"
              v-model="password"
            ></v-text-field>
            <!-- Checkbox to remember login, right aligned -->
            <div class="d-flex justify-end">
              <v-checkbox
                v-model="rememberMe"
                :label="$t('login.rememberMe')"
              />
            </div>
          </v-form>
        </v-card-text>
          <SaplingLoginAction
            :handleAzure="handleAzure"
            :handleGoogle="handleGoogle"
            :handleLogin="handleLogin"
          />
      </template>
    </v-card>
    <!-- Password change dialog displayed after login if required -->
    <SaplingChangePassword :model-value="showPasswordChange" @close="handlePasswordChangeSuccess" />
  </v-container>
</template>

<script setup lang="ts">
//#region Import
// Import the composable for handling login logic
import { useSaplingLogin } from '@/composables/account/useSaplingLogin';
// Import the password change dialog component
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue';
// Import the tilt constants for styling
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
// Import the extracted SaplingLoginAction component
import SaplingLoginAction from '@/components/actions/SaplingLoginAction.vue';
//#endregion

//#region Composable
// Destructure the properties and methods from the useSaplingLogin composable
const {
  email, // Reactive property for the email input
  password, // Reactive property for the password input
  rememberMe, // Reactive property for the remember me checkbox
  isLoading, // Reactive property indicating if the login process is loading
  messages, // Reactive property for error messages
  handleLogin, // Method to handle the login process
  handleAzure, // Method to handle Azure login
  handleGoogle, // Method to handle Google login
  showPasswordChange, // Reactive property to show the password change dialog
  handlePasswordChangeSuccess // Method to handle successful password change
} = useSaplingLogin();
//#endregion
</script>