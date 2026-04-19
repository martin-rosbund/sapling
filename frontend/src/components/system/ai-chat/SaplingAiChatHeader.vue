<template>
  <div class="sapling-ai-chat__header">
    <div>
      <div class="sapling-ai-chat__eyebrow">{{ t('aiChat.titleEyebrow') }}</div>
      <div class="sapling-ai-chat__title">{{ assistantName }}</div>
    </div>

    <div class="sapling-ai-chat__header-actions">
      <v-btn
        v-if="isCompactHeaderActions"
        icon="mdi-refresh"
        size="small"
        variant="text"
        :aria-label="t('aiChat.refresh')"
        :title="t('aiChat.refresh')"
        @click="emit('refresh')"
      />
      <v-btn
        v-else
        size="small"
        variant="text"
        prepend-icon="mdi-refresh"
        :aria-label="t('aiChat.refresh')"
        :title="t('aiChat.refresh')"
        @click="emit('refresh')"
      >
        {{ t('aiChat.refresh') }}
      </v-btn>
      <v-btn
        v-if="isCompactHeaderActions"
        icon="mdi-plus"
        size="small"
        variant="tonal"
        :aria-label="t('aiChat.newChat')"
        :title="t('aiChat.newChat')"
        @click="emit('newChat')"
      />
      <v-btn
        v-else
        size="small"
        variant="tonal"
        prepend-icon="mdi-plus"
        :aria-label="t('aiChat.newChat')"
        :title="t('aiChat.newChat')"
        @click="emit('newChat')"
      >
        {{ t('aiChat.newChat') }}
      </v-btn>
      <v-btn icon="mdi-close" variant="text" size="small" @click="emit('close')" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineProps<{
  assistantName: string
  isCompactHeaderActions: boolean
}>()

const emit = defineEmits<{
  (event: 'refresh'): void
  (event: 'newChat'): void
  (event: 'close'): void
}>()

const { t } = useI18n()
</script>