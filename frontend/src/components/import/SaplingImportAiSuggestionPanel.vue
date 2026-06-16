<template>
  <v-alert
    v-if="aiSuggestion"
    type="info"
    variant="tonal"
    density="comfortable"
    class="sapling-import__ai-suggestion"
  >
    <div class="sapling-import__ai-suggestion-title">
      {{ t('import.aiSuggestionApplied') }}
    </div>
    <div class="sapling-import__ai-suggestion-chips">
      <v-chip size="small" variant="tonal">
        {{ aiSuggestion.mappings.length }} {{ t('import.aiSuggestedFields') }}
      </v-chip>
      <v-chip v-if="aiSuggestion.externalKey?.columns.length" size="small" variant="tonal">
        {{ t('import.externalKeyColumns') }}:
        {{ aiSuggestion.externalKey.columns.join(', ') }}
      </v-chip>
      <v-chip
        v-for="reference in aiSuggestion.referenceFields"
        :key="`${reference.targetField}-${reference.sourceColumn ?? ''}`"
        size="small"
        variant="tonal"
      >
        {{ fieldLabel(reference.targetField) }}
      </v-chip>
      <v-chip
        v-for="mapping in aiSuggestion.valueMappings"
        :key="mapping.targetField"
        size="small"
        color="primary"
        variant="tonal"
      >
        {{ fieldLabel(mapping.targetField) }}: {{ t('import.valueMapping') }}
      </v-chip>
    </div>
    <div v-if="aiSuggestion.warnings.length" class="sapling-import__ai-warnings">
      <span v-for="warning in aiSuggestion.warnings" :key="warning">{{ warning }}</span>
    </div>
  </v-alert>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { ImportAiSuggestion } from '@/services/api.import.service'

defineProps<{
  aiSuggestion: ImportAiSuggestion | null
  fieldLabel: (fieldName: string) => string
}>()

const { t } = useI18n()
</script>
