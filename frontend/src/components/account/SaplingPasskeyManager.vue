<template>
  <section class="sapling-passkey-manager">
    <div class="sapling-passkey-manager__header">
      <div>
        <div class="sapling-passkey-manager__eyebrow">
          {{ $t('login.security') }}
        </div>
        <h3>{{ $t('login.passkeys') }}</h3>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-key-plus"
        :disabled="!isSupported || isRegistering"
        :loading="isRegistering"
        @click="registerPasskey"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('login.addPasskey') }}
        </template>
      </v-btn>
    </div>

    <v-alert v-if="errorMessage" class="mt-3" type="error" variant="tonal" density="comfortable">
      {{ errorMessage }}
    </v-alert>

    <v-alert
      v-else-if="!isSupported"
      class="mt-3"
      type="warning"
      variant="tonal"
      density="comfortable"
    >
      {{ $t('login.passkeyUnsupported') }}
    </v-alert>

    <v-text-field
      v-model="newPasskeyLabel"
      class="mt-4"
      :label="$t('login.passkeyLabel')"
      prepend-icon="mdi-key-outline"
      maxlength="128"
      hide-details
    />

    <v-skeleton-loader v-if="isLoading" class="mt-4" type="list-item-three-line" />

    <v-list v-else-if="passkeys.length > 0" class="sapling-passkey-manager__list mt-4">
      <v-list-item v-for="passkey in passkeys" :key="passkey.handle">
        <template #prepend>
          <v-icon color="primary">mdi-key-variant</v-icon>
        </template>

        <v-list-item-title>{{ passkey.label }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ $t('login.passkeyCreatedAt') }}:
          {{ formatPasskeyDate(passkey.createdAt) }}
        </v-list-item-subtitle>
        <v-list-item-subtitle>
          {{ $t('login.passkeyLastUsedAt') }}:
          {{ formatPasskeyDate(passkey.lastUsedAt) }}
        </v-list-item-subtitle>

        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            color="error"
            :loading="deletingHandle === passkey.handle"
            :disabled="deletingHandle === passkey.handle"
            :title="$t('global.delete')"
            @click="deletePasskey(passkey)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-alert v-else class="mt-4" type="info" variant="tonal" density="comfortable">
      {{ $t('login.noPasskeys') }}
    </v-alert>
  </section>
</template>

<script setup lang="ts">
import { useSaplingPasskeys } from '@/composables/account/useSaplingPasskeys'

const {
  passkeys,
  isLoading,
  isRegistering,
  deletingHandle,
  errorMessage,
  newPasskeyLabel,
  isSupported,
  registerPasskey,
  deletePasskey,
  formatPasskeyDate,
} = useSaplingPasskeys()
</script>
