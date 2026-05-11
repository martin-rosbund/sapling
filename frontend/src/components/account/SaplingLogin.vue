<template>
  <!-- Container for the login form, styled to center content both vertically and horizontally -->
  <v-container class="sapling-login-shell d-flex flex-column justify-center align-center" fluid>
    <!-- Card container for the login form -->
    <SaplingDialogCard class="sapling-dialog-small sapling-login-dialog" :elevation="10">
      <template v-if="isLoading">
        <SaplingInstanceBooting />
      </template>
      <template v-else>
        <SaplingDialogShell body-class="sapling-login-dialog__body">
          <template #hero>
            <SaplingDialogHero eyebrow="Cloud CRM Sapling" :title="$t('login.title')" />
          </template>

          <template #body>
            <v-form class="sapling-dialog-form" @submit.prevent="handleLogin">
              <v-alert
                v-if="loginErrorMessage"
                class="mb-4"
                type="error"
                variant="tonal"
                density="comfortable"
              >
                {{ loginErrorMessage }}
              </v-alert>
              <v-text-field
                :label="$t('login.username')"
                prepend-icon="mdi-account"
                type="email"
                autocomplete="username"
                autofocus
                v-model="email"
                @keyup.enter="handleLogin"
              />
              <v-text-field
                :label="$t('login.password')"
                prepend-icon="mdi-lock"
                type="password"
                autocomplete="current-password"
                v-model="password"
                @keyup.enter="handleLogin"
              />
              <v-checkbox
                v-model="rememberMe"
                :label="$t('login.rememberMe')"
                class="d-flex justify-end"
              />
              <!-- Hidden submit button so browsers treat Enter as form submission
                   even though the visible primary button lives in the action bar. -->
              <button
                type="submit"
                class="sapling-login-hidden-submit"
                tabindex="-1"
                aria-hidden="true"
              />
            </v-form>
          </template>

          <template #actions>
            <SaplingActionLogin
              :handleAzure="handleAzure"
              :handleGoogle="handleGoogle"
              :handleLogin="handleLogin"
              :isLoading="isAuthenticating"
            />
          </template>
        </SaplingDialogShell>
      </template>
    </SaplingDialogCard>
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
import SaplingInstanceBooting from '@/components/account/SaplingInstanceBooting.vue'
import { useSaplingLogin } from '@/composables/account/useSaplingLogin'
// Import the password change dialog component
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue'
// Import the extracted SaplingActionLogin component
import SaplingActionLogin from '@/components/actions/SaplingActionLogin.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
//#endregion

//#region Composable
// Destructure the properties and methods from the useSaplingLogin composable
const {
  email, // Reactive property for the email input
  password, // Reactive property for the password input
  rememberMe, // Reactive property for the remember me checkbox
  isLoading, // Reactive property indicating if the login process is loading
  isAuthenticating, // Reactive property indicating if the authentication process is ongoing
  loginErrorMessage,
  handleLogin, // Method to handle the login process
  handleAzure, // Method to handle Azure login
  handleGoogle, // Method to handle Google login
  showPasswordChange, // Reactive property to show the password change dialog
  requirePasswordChange,
  handlePasswordChangeSuccess, // Method to handle successful password change
} = useSaplingLogin()
//#endregion
</script>

<style scoped>
.sapling-login-hidden-submit {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
