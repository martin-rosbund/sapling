<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn
        v-if="IS_LOGIN_WITH_AZURE_ENABLED"
        icon="mdi-microsoft-azure"
        color="primary"
        @click="handleAzure"
      />
      <v-btn
        v-if="IS_LOGIN_WITH_GOOGLE_ENABLED"
        icon="mdi-google"
        color="primary"
        @click="handleGoogle"
      />
    </template>

    <template #trailing>
      <v-btn
        color="primary"
        append-icon="mdi-login"
        @click="handleLogin"
        :loading="isLoading"
        :disabled="isLoading"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('login.login') }}
        </template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script setup lang="ts">
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

// Import constants to check if Azure and Google login are enabled
import {
  IS_LOGIN_WITH_AZURE_ENABLED,
  IS_LOGIN_WITH_GOOGLE_ENABLED,
} from '@/constants/project.constants'

// Define props for the actions
defineProps({
  handleAzure: Function,
  handleGoogle: Function,
  handleLogin: Function,
  isLoading: Boolean,
})
</script>
