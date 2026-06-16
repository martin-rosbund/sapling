<template>
  <div v-if="hasBatch && fields.length > 0" class="sapling-import__mapping">
    <div v-for="field in fields" :key="field.name" class="sapling-import__mapping-row">
      <div class="sapling-import__mapping-label">
        <v-icon size="18">{{ field.isReference ? 'mdi-link' : 'mdi-form-textbox' }}</v-icon>
        <span>{{ fieldLabel(field.name) }}</span>
        <v-chip v-if="field.isRequired" size="x-small" color="primary" variant="tonal">
          *
        </v-chip>
        <v-tooltip
          v-if="aiSuggestionFieldDetails[field.name]"
          :text="aiSuggestionReason(field.name)"
        >
          <template #activator="{ props: tooltipProps }">
            <v-chip v-bind="tooltipProps" size="x-small" color="info" variant="tonal">
              AI {{ confidencePercent(aiSuggestionFieldDetails[field.name].confidence) }}
            </v-chip>
          </template>
        </v-tooltip>
      </div>

      <v-select
        v-model="fieldMappings[field.name]"
        :items="headerOptions"
        density="compact"
        hide-details
        clearable
        :placeholder="field.name"
        autocomplete="off"
        @update:model-value="emit('fieldMappingChange', field.name)"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps" class="sapling-import__source-option-item">
            <template #title>
              <div class="sapling-import__source-option">
                <span class="sapling-import__source-option-title">
                  {{ getSourceColumnOptionTitle(item) }}
                </span>
                <v-chip
                  v-if="sourceColumnUsageLabels(getSourceColumnOptionValue(item)).length > 0"
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-check-circle-outline"
                >
                  {{ sourceColumnUsageSummary(getSourceColumnOptionValue(item)) }}
                </v-chip>
              </div>
            </template>
            <template v-if="sourceColumnUsageLabels(getSourceColumnOptionValue(item)).length > 0" #subtitle>
              <span class="sapling-import__source-option-subtitle">
                {{ sourceColumnUsageLabels(getSourceColumnOptionValue(item)).join(', ') }}
              </span>
            </template>
          </v-list-item>
        </template>
      </v-select>

      <SaplingImportTemplateValueField
        v-model="fieldDefaults[field.name]"
        :template="field"
        :entity-handle="selectedEntityHandle ?? ''"
        :visible-templates="fields"
        :permissions="permissions"
        :reference-items="referenceItemsForField(field)"
        :disabled="!hasBatch || isImportJobRunning"
      />

      <div class="sapling-import__value-mapping-action">
        <v-tooltip :text="t('import.valueMapping')">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon="mdi-swap-horizontal"
              size="small"
              variant="tonal"
              :color="hasValueMapping(field.name) ? 'primary' : undefined"
              :disabled="!fieldMappings[field.name] || isImportJobRunning"
              :aria-label="t('import.valueMapping')"
              @click="emit('openValueMapping', field)"
            />
          </template>
        </v-tooltip>
      </div>

      <div
        v-if="field.isReference && field.referenceName"
        class="sapling-import__relation-mapping-controls"
      >
        <v-select
          v-model="relationMappingModes[field.name]"
          :items="relationMappingModeOptions"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          clearable
          :placeholder="t('import.relationMapping')"
          autocomplete="off"
        />
        <v-select
          v-model="relationMappingColumns[field.name]"
          :items="headerOptions"
          density="compact"
          hide-details
          clearable
          multiple
          chips
          :disabled="!relationMappingModes[field.name] || isImportJobRunning"
          :placeholder="t('import.externalKeyColumns')"
          autocomplete="off"
          @update:model-value="emit('normalizeRelationMappingColumns', field.name)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import SaplingImportTemplateValueField from '@/components/import/SaplingImportTemplateValueField.vue'
import type { ImportRelationMappingMode } from '@/services/api.import.service'
import type { SaplingGenericItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'

type RelationMappingModeOption = {
  title: string
  value: ImportRelationMappingMode
}

defineProps<{
  hasBatch: boolean
  fields: EntityTemplate[]
  fieldMappings: Record<string, string | null>
  fieldDefaults: Record<string, unknown>
  relationMappingModes: Record<string, ImportRelationMappingMode | null>
  relationMappingColumns: Record<string, string[]>
  relationMappingModeOptions: RelationMappingModeOption[]
  headerOptions: string[]
  selectedEntityHandle: string | null
  permissions: AccumulatedPermission[]
  aiSuggestionFieldDetails: Record<string, { confidence: number; reason: string | null }>
  isImportJobRunning: boolean
  fieldLabel: (fieldName: string) => string
  aiSuggestionReason: (targetField: string) => string
  confidencePercent: (confidence: number) => string
  referenceItemsForField: (
    field: EntityTemplate | null | undefined,
  ) => Record<string, SaplingGenericItem | null | undefined> | undefined
  hasValueMapping: (targetField: string) => boolean
  getSourceColumnOptionValue: (item: unknown) => string
  getSourceColumnOptionTitle: (item: unknown) => string
  sourceColumnUsageLabels: (sourceColumn: string) => string[]
  sourceColumnUsageSummary: (sourceColumn: string) => string
}>()

const emit = defineEmits<{
  (event: 'fieldMappingChange', targetField: string): void
  (event: 'openValueMapping', field: EntityTemplate): void
  (event: 'normalizeRelationMappingColumns', targetField: string): void
}>()

const { t } = useI18n()
</script>
