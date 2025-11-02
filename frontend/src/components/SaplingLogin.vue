<template>
  <!-- Login form with email, password, and Azure login -->
  <v-container class="d-flex justify-center align-center" style="min-height: 300px;">
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <v-card class="pa-6 sapling-login-dialog" max-width="600" elevation="10">
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
            <v-btn v-if="IS_LOGIN_WITH_AZURE_ENABLED" color="primary" @click="handleAzure" class="ma-2">
              {{ $t('login.azureLogin') }}
            </v-btn>
            <v-btn v-if="IS_LOGIN_WITH_GOOGLE_ENABLED" color="primary" @click="handleGoogle" class="ma-2">
              {{ $t('login.googleLogin') }}
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
import { IS_LOGIN_WITH_AZURE_ENABLED, IS_LOGIN_WITH_GOOGLE_ENABLED } from '@/constants/project.constants';
import { useSaplingLogin } from '../composables/useSaplingLogin';
import '@/assets/styles/SaplingLogin.css';

const {
  email,
  password,
  isLoading,
  messages,
  translationService,
  handleLogin,
  handleAzure,
  handleGoogle
} = useSaplingLogin();
</script>