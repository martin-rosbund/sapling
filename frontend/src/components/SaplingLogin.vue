<template>
  <!-- Container for the login form, styled to center content both vertically and horizontally -->
  <v-container class="d-flex justify-center align-center" style="min-height: 300px;">
    <!-- Snackbar queue to display error messages -->
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <!-- Card container for the login form -->
    <v-card class="pa-6" elevation="10">
      <!-- Skeleton loader displayed while loading -->
      <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto"
        elevation="12"
        type="article, actions"/>
      <template v-else>
        <!-- Title of the login form -->
        <v-card-title class="text-h5 text-center">
          {{ $t('login.title') }}
        </v-card-title>
        <!-- Login form with fields for email and password -->
        <v-card-text class="sapling-login-card-text">
          <v-form @submit.prevent="handleLogin">
            <!-- Email input field -->
            <v-text-field
              :label="$t('login.username')"
              prepend-icon="mdi-account"
              type="email"
              v-model="email"
            ></v-text-field>
            <!-- Password input field -->
            <v-text-field
              :label="$t('login.password')"
              prepend-icon="mdi-lock"
              type="password"
              v-model="password"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <!-- Row containing action buttons -->
        <v-row justify="space-between">
          <v-card-actions>
            <!-- Azure login button, displayed if enabled -->
            <v-btn v-if="IS_LOGIN_WITH_AZURE_ENABLED" icon="mdi-microsoft-azure" color="primary" @click="handleAzure" class="ma-2"/>
            <!-- Google login button, displayed if enabled -->
            <v-btn v-if="IS_LOGIN_WITH_GOOGLE_ENABLED" icon="mdi-google" color="primary" @click="handleGoogle" class="ma-2"/>
          </v-card-actions>
          <v-card-actions>
            <!-- Login button to submit the form -->
            <v-btn color="primary" @click="handleLogin" class="ma-2">
              {{ $t('login.login') }}
            </v-btn>
          </v-card-actions>
        </v-row>
      </template>
    </v-card>
    <!-- Password change dialog displayed after login if required -->
    <SaplingChangePassword :model-value="showPasswordChange" @close="handlePasswordChangeSuccess" />
  </v-container>
</template>

<script setup lang="ts">
//#region Import
// Import constants to check if Azure and Google login are enabled
import { IS_LOGIN_WITH_AZURE_ENABLED, IS_LOGIN_WITH_GOOGLE_ENABLED } from '@/constants/project.constants';
// Import the composable for handling login logic
import { useSaplingLogin } from '../composables/useSaplingLogin';
// Import the password change dialog component
import SaplingChangePassword from './SaplingChangePassword.vue';
// Import the CSS file for styling the login component
import '@/assets/styles/SaplingLogin.css';
//#endregion

//#region Composable
// Destructure the properties and methods from the useSaplingLogin composable
const {
  email, // Reactive property for the email input
  password, // Reactive property for the password input
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