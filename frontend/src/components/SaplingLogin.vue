<template>
  <v-container class="d-flex justify-center align-center" style="min-height: 300px;">
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <v-card class="pa-6" max-width="400" elevation="10">
      <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto"
        elevation="12"
        type="article, actions"
      ></v-skeleton-loader>
      <template v-else>
        <v-card-title class="text-h5 text-center">
          {{translationService.translate('login', 'title')}}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleLogin">
            <v-text-field
              :label="translationService.translate('login', 'username')"
              prepend-icon="mdi-account"
              type="email"
              v-model="email"
            ></v-text-field>
            <v-text-field
              :label="translationService.translate('login', 'password')"
              prepend-icon="mdi-lock"
              type="password"
              v-model="password"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-divider class="my-4"></v-divider>
        <v-card-actions class="d-flex justify-center">
          <v-btn color="primary" @click="handleAzure" class="ma-2">
            {{translationService.translate('login', 'azureLogin')}}
          </v-btn>
          <v-btn color="primary" @click="handleLogin" class="ma-2">
            {{translationService.translate('login', 'login')}}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
    </v-container>
  </template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import axios from 'axios';
import TranslationService from '@/services/translation.service';

export default defineComponent({
  name: 'LoginView',
  setup() {
    const email = ref(import.meta.env.VITE_DEBUG_USERNAME || "");
    const password = ref(import.meta.env.VITE_DEBUG_PASSWORD || "");
    const isLoading = ref(true);
    const messages = ref<string[]>([])
    const translationService = ref(new TranslationService('de-DE'));

    onMounted(async () => {
      await translationService.value.prepare('login');
      isLoading.value = false;
    });

    const handleLogin = async () => {
      try {
        await axios.post(import.meta.env.VITE_BACKEND_URL + 'auth/local/login', {
          loginName: email.value,
          loginPassword: password.value,
        });
        window.location.href = '/';
      } catch {
        messages.value.push(translationService.value.translate('login', 'wrongCredentials'));
      }
    };

    const handleAzure= async () => {
      window.location.href = import.meta.env.VITE_BACKEND_URL +'auth/azure/login';
    };

    return {
      email,
      password,
      handleLogin,
      handleAzure,
      translationService,
      isLoading,
      messages
    };
  },
});
</script>