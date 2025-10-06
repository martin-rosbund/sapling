<template>
  <v-container class="fill-height">
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
            <v-toolbar-title>{{ translation?.data.find(property => property.language === 'de-DE')?.value }}</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                label="E-Mail"
                prepend-icon="mdi-account"
                type="email"
                v-model="email"
              ></v-text-field>
              <v-text-field
                label="Passwort"
                prepend-icon="mdi-lock"
                type="password"
                v-model="password"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="handleAzure">Azure AD</v-btn>
          </v-card-actions>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="handleLogin">Anmelden</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">

import { defineComponent, onMounted, ref } from 'vue';
import axios from 'axios';
import ApiService from '@/services/api.service';
import type {TranslationItem} from '../entity/entity';
import type { PaginatedResponse } from '../entity/structure';

export default defineComponent({
  name: 'LoginView',
  setup() {
    const email = ref(import.meta.env.VITE_DEBUG_USERNAME || "");
    const password = ref(import.meta.env.VITE_DEBUG_PASSWORD || "");
    const translation = ref<PaginatedResponse<TranslationItem> | null>(null);
    const isLoading = ref(true);

    const translationService = new ApiService<TranslationItem>('translation');

    onMounted(async () => {
      try {
        const result = await translationService.find(1, 100, { entity: 'login', language: 'de-DE' });
        translation.value = result;
      } catch (error) {
        console.error("Fehler beim Laden der Übersetzungen:", error);
      } finally {
        isLoading.value = false;
      }
    });

    const handleLogin = async () => {
      try {
        const response = await axios.post('http://localhost:3000/sapling/login', {
          loginName: email.value,
          loginPassword: password.value,
        });
        alert(response.status);
      } catch (error: any) {
        alert(error.response?.data?.message || 'Ein Fehler ist aufgetreten.');
      }
    };

    const handleAzure= async () => {
      window.location.href = 'http://localhost:3000/azure/login';
    };

    return {
      email,
      password,
      handleLogin,
      handleAzure,
      translation,
      isLoading
    };
  },
});
</script>