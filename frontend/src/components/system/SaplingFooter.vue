<template>
  <v-btn
    v-if="hasSaplingAiChatAccess"
    class="sapling-footer__ai-fab"
    color="primary"
    icon="mdi-robot-happy-outline"
    size="large"
    elevation="12"
    @click="toggleSaplingAiChat"
  />
</template>

<script lang="ts" setup>
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'

const { toggleSaplingAiChat, hasSaplingAiChatAccess } = useSaplingAiChat()
</script>
