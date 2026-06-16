<template>
  <div class="sapling-import__actions">
    <v-btn
      variant="tonal"
      prepend-icon="mdi-auto-fix"
      :disabled="!canSuggestWithAi"
      :loading="isSuggesting"
      @click="emit('suggest')"
    >
      {{ t('import.createAiSuggestion') }}
    </v-btn>
    <v-btn
      variant="tonal"
      prepend-icon="mdi-table-cog"
      :disabled="!hasSelectedTemplate"
      @click="emit('applyTemplate')"
    >
      {{ t('import.loadTemplate') }}
    </v-btn>
    <v-btn
      variant="tonal"
      prepend-icon="mdi-content-save-check-outline"
      :disabled="!canSaveTemplate"
      :loading="isSavingTemplate"
      @click="emit('saveTemplate')"
    >
      {{ t('import.saveTemplate') }}
    </v-btn>
    <v-btn
      color="primary"
      prepend-icon="mdi-check-circle-outline"
      :disabled="!canConfigure"
      :loading="isConfiguring"
      @click="emit('configure')"
    >
      {{ t('import.configure') }}
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineProps<{
  canSuggestWithAi: boolean
  isSuggesting: boolean
  hasSelectedTemplate: boolean
  canSaveTemplate: boolean
  isSavingTemplate: boolean
  canConfigure: boolean
  isConfiguring: boolean
}>()

const emit = defineEmits<{
  (event: 'suggest'): void
  (event: 'applyTemplate'): void
  (event: 'saveTemplate'): void
  (event: 'configure'): void
}>()

const { t } = useI18n()
</script>
