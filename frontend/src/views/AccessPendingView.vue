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
import axios from 'axios'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BACKEND_URL } from '@/constants/project.constants'

const { t, te } = useI18n()

const translatedTitle = computed(() =>
  te('login.accessPendingTitle') ? t('login.accessPendingTitle') : 'Anmeldung erfolgreich',
)

const translatedDescription = computed(() =>
  te('login.accessPendingDescription')
    ? t('login.accessPendingDescription')
    : 'Ihre Anmeldung war erfolgreich, aber Ihrem Benutzerkonto ist derzeit keine Rolle zugewiesen. Bitte wenden Sie sich an Ihren Vorgesetzten, um Zugriff auf Sapling zu erhalten.',
)

async function logout() {
  await axios.post(BACKEND_URL + 'auth/logout')
  window.location.href = '/login'
}
</script>

<style scoped>
.sapling-access-pending {
  padding: 24px;
}

.sapling-access-pending__card {
  width: min(100%, 640px);
  padding: 32px;
  display: grid;
  gap: 24px;
  text-align: center;
}

.sapling-access-pending__icon {
  display: flex;
  justify-content: center;
}

.sapling-access-pending__copy {
  display: grid;
  gap: 12px;
}

.sapling-access-pending__eyebrow {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.sapling-access-pending__title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  line-height: 1.1;
}

.sapling-access-pending__text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.sapling-access-pending__actions {
  display: flex;
  justify-content: center;
}

@media (max-width: 600px) {
  .sapling-access-pending__card {
    padding: 24px;
  }
}
</style>
