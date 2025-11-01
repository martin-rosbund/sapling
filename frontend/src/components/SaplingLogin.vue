<template>
  <!-- Login form with email, password, and Azure login -->
  <v-container class="d-flex justify-center align-center" style="min-height: 300px;">
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <v-card class="pa-6" max-width="600" elevation="10">
      <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto"
        elevation="12"
        type="article, actions"/>
      <template v-else>
        <v-card-title class="text-h5 text-center">
          {{ $t('login.title') }}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleLogin">
            <v-text-field
              :label="$t('login.username')"
              prepend-icon="mdi-account"
              type="email"
              v-model="email"
            ></v-text-field>
            <v-text-field
              :label="$t('login.password')"
              prepend-icon="mdi-lock"
              type="password"
              v-model="password"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-divider class="my-4"></v-divider>
        <v-row justify="center" >
          <v-card-actions class="d-flex justify-center">  
            <v-btn color="primary" @click="handleAzure" class="ma-2">
              {{ $t('login.azureLogin') }}
            </v-btn>
            <v-btn color="primary" @click="handleLogin" class="ma-2">
              {{ $t('login.login') }}
            </v-btn>
          </v-card-actions>
        </v-row>
      </template>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  // #region Imports
  import { ref, onMounted, watch } from 'vue';
  import axios from 'axios';
  import TranslationService from '@/services/translation.service';
  import { i18n } from '@/i18n';
  import { BACKEND_URL, DEBUG_PASSWORD, DEBUG_USERNAME } from '@/constants/project.constants';
  // #endregion

  // #region Refs
  const email = ref(DEBUG_USERNAME);
  const password = ref(DEBUG_PASSWORD);
  const isLoading = ref(true);
  const messages = ref<string[]>([]);
  const translationService = ref(new TranslationService());
  // #endregion

  // #region Stores
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await translationService.value.prepare('login');
    isLoading.value = false;
  });

  watch(
    () => i18n.global.locale.value,
    async () => {
      isLoading.value = true;
      translationService.value = new TranslationService();
      await translationService.value.prepare('login');
      isLoading.value = false;
    }
  );
  // #endregion

  // #region Login: Locale
  async function handleLogin() {
    try {
      await axios.post(BACKEND_URL + 'auth/local/login', {
        loginName: email.value,
        loginPassword: password.value,
      });
      window.location.href = '/';
    } catch {
      messages.value.push(i18n.global.t('login.wrongCredentials'));
    }
  }
  // #endregion

  // #region Login: Azure
  function handleAzure() {
    window.location.href = BACKEND_URL + 'auth/azure/login';
  }
  // #endregion
</script>