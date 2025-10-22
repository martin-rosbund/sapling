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

<script lang="ts">
  // Import required modules and services
  import { watch, defineComponent, onMounted, ref } from 'vue';
  import axios from 'axios';
  import TranslationService from '@/services/translation.service';
  import { i18n } from '@/i18n';

  export default defineComponent({
    setup() {
      // Email input (pre-filled in debug mode)
      const email = ref(import.meta.env.VITE_DEBUG_USERNAME || "");
      // Password input (pre-filled in debug mode)
      const password = ref(import.meta.env.VITE_DEBUG_PASSWORD || "");
      // Loading state
      const isLoading = ref(true);
      // Error or info messages
      const messages = ref<string[]>([])
      // Translation service instance
      const translationService = ref(new TranslationService());

      // Prepare translations on mount
      onMounted(async () => {
        await translationService.value.prepare('login');
        isLoading.value = false;
      });

      // Watch for language changes and reload translations
      watch(
        () => i18n.global.locale.value,
        async () => {
          isLoading.value = true;
          translationService.value = new TranslationService();
          await translationService.value.prepare('login');
          isLoading.value = false;
        });

      // Handle login form submission
      const handleLogin = async () => {
        try {
          await axios.post(import.meta.env.VITE_BACKEND_URL + 'auth/local/login', {
            loginName: email.value,
            loginPassword: password.value,
          });
          window.location.href = '/';
        } catch {
          messages.value.push(i18n.global.t('login.wrongCredentials'));
        }
      };

      // Handle Azure login button
      const handleAzure= async () => {
        window.location.href = import.meta.env.VITE_BACKEND_URL +'auth/azure/login';
      };

      // Expose variables and methods to template
      return {
        email,
        password,
        handleLogin,
        handleAzure,
        isLoading,
        messages
      };
    },
  });
</script>