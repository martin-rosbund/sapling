<template>
  <v-container
    class="sapling-login-shell sapling-access-pending d-flex flex-column justify-center align-center"
    fluid
  >
    <v-card class="glass-panel sapling-dialog-small sapling-access-pending__card" elevation="10">
      <div class="sapling-access-pending__icon">
        <v-icon color="success" size="56">mdi-check-circle-outline</v-icon>
      </div>

      <div class="sapling-access-pending__copy">
        <p class="sapling-access-pending__eyebrow">Sapling</p>
        <h1 class="sapling-access-pending__title">{{ translatedTitle }}</h1>
        <p class="sapling-access-pending__text">{{ translatedDescription }}</p>
      </div>

      <div class="sapling-access-pending__actions">
        <v-btn color="primary" prepend-icon="mdi-logout" variant="flat" @click="logout">
          {{ $t('login.logout') }}
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import '@/assets/styles/SaplingAccessPending.css'
import axios from 'axios'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildApiUrl } from '@/services/api.client'

const { t } = useI18n()

const translatedTitle = computed(() => t('login.accessPendingTitle'))

const translatedDescription = computed(() => t('login.accessPendingDescription'))

async function logout() {
  await axios.post(buildApiUrl('auth/logout'))
  window.location.href = '/login'
}
</script>
