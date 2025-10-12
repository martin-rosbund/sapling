<template>
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
          {{ $t('title') }}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleLogin">
            <v-text-field
              :label="$t('username')"
              prepend-icon="mdi-account"
              type="email"
              v-model="email"
            ></v-text-field>
            <v-text-field
              :label="$t('password')"
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
              {{ $t('azureLogin') }}
            </v-btn>
            <v-btn color="primary" @click="handleLogin" class="ma-2">
              {{ $t('login') }}
            </v-btn>
          </v-card-actions>
			  </v-row>
      </template>
    </v-card>
    </v-container>
  </template>

<script lang="ts">
  import { watch, defineComponent, onMounted, ref } from 'vue';
  import axios from 'axios';
  import TranslationService from '@/services/translation.service';
  import CookieService from '@/services/cookie.service';
  import { i18n } from '@/i18n';

  export default defineComponent({
    setup() {
      const email = ref(import.meta.env.VITE_DEBUG_USERNAME || "");
      const password = ref(import.meta.env.VITE_DEBUG_PASSWORD || "");
      const isLoading = ref(true);
      const messages = ref<string[]>([])
      const translationService = ref(new TranslationService(CookieService.get('language')));

      onMounted(async () => {
        await translationService.value.prepare('login');
        isLoading.value = false;
      });

      watch(
      () => i18n.global.locale.value,
      async (newLocale) => {
        isLoading.value = true;
        translationService.value = new TranslationService(newLocale);
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
          messages.value.push(i18n.global.t('wrongCredentials'));
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
        isLoading,
        messages
      };
    },
  });
</script>