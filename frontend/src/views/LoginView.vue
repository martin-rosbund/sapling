<template>
  <v-container class="fill-height">
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-skeleton-loader
          v-if="isLoading"
          class="mx-auto"
          elevation="12"
          type="article, actions"
        ></v-skeleton-loader>
        <v-card v-else class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>{{translationService.translate('login', 'title')}}</v-toolbar-title>
          </v-toolbar>
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
            <v-card-actions>
            <v-btn color="primary" @click="handleAzure" class="mr-auto">
              {{translationService.translate('login', 'azureLogin')}}
            </v-btn>
            <v-btn color="primary" @click="handleLogin">
              {{translationService.translate('login', 'login')}}
            </v-btn>
            </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
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
        await axios.post('http://localhost:3000/auth/local/login', {
          loginName: email.value,
          loginPassword: password.value,
        });
        window.location.href = '/';
      } catch {
        messages.value.push(translationService.value.translate('login', 'wrongCredentials'));
      }
    };

    const handleAzure= async () => {
      window.location.href = 'http://localhost:3000/auth/azure/login';
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