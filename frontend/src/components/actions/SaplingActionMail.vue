<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="close">
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('global.close') }}
        </template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-eye-outline"
        :loading="isPreviewLoading"
        @click="refreshPreview"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('mail.reloadPreview') }}
        </template>
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi-send" :loading="isSending" @click="send">
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('mail.send') }}
        </template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

defineProps<{
  close: () => void
  refreshPreview: () => void
  send: () => void
  isPreviewLoading: boolean
  isSending: boolean
}>()
</script>
