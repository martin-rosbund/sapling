<template>
  <div v-if="hasBatch && fields.length > 0" class="sapling-import__mapping">
    <div v-for="field in fields" :key="field.name" class="sapling-import__mapping-row">
      <div class="sapling-import__mapping-label">
        <v-icon size="18">{{ field.isReference ? 'mdi-link' : 'mdi-form-textbox' }}</v-icon>
        <span>{{ fieldLabel(field.name) }}</span>
        <v-chip v-if="field.isRequired" size="x-small" color="primary" variant="tonal"> * </v-chip>
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
        :model-value="fieldMappings[field.name]"
        :items="headerOptions"
        density="compact"
        hide-details
        clearable
        :placeholder="field.name"
        autocomplete="off"
        @update:model-value="updateFieldMapping(field.name, $event)"
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
            <template
              v-if="sourceColumnUsageLabels(getSourceColumnOptionValue(item)).length > 0"
              #subtitle
            >
              <span class="sapling-import__source-option-subtitle">
                {{ sourceColumnUsageLabels(getSourceColumnOptionValue(item)).join(', ') }}
              </span>
            </template>
          </v-list-item>
        </template>
      </v-select>

      <SaplingImportTemplateValueField
        :model-value="fieldDefaults[field.name]"
        :template="field"
        :entity-handle="selectedEntityHandle ?? ''"
        :visible-templates="fields"
        :permissions="permissions"
        :reference-items="referenceItemsForField(field)"
        :disabled="!hasBatch || isImportJobRunning"
        @update:model-value="updateFieldDefault(field.name, $event)"
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

      <div v-if="isUniqueConflictField(field)" class="sapling-import__unique-conflict-controls">
        <v-select
          :model-value="uniqueConflictStrategies[field.name] ?? 'error'"
          :items="uniqueConflictStrategyOptions"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          :label="t('import.uniqueConflictStrategy')"
          prepend-inner-icon="mdi-key-alert-outline"
          :disabled="isImportJobRunning"
          autocomplete="off"
          @update:model-value="updateUniqueConflictStrategy(field.name, $event)"
        />
      </div>

      <div
        v-if="field.isReference && field.referenceName"
        class="sapling-import__relation-mapping-controls"
      >
        <v-select
          :model-value="relationMappingModes[field.name]"
          :items="relationMappingModeOptions"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          clearable
          :placeholder="t('import.relationMapping')"
          autocomplete="off"
          @update:model-value="updateRelationMappingMode(field.name, $event)"
        />
        <v-select
          :model-value="relationMappingColumns[field.name]"
          :items="headerOptions"
          density="compact"
          hide-details
          clearable
          multiple
          chips
          :disabled="!relationMappingModes[field.name] || isImportJobRunning"
          :placeholder="t('import.externalKeyColumns')"
          autocomplete="off"
          @update:model-value="updateRelationMappingColumns(field.name, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import SaplingImportTemplateValueField from '@/components/import/SaplingImportTemplateValueField.vue'
import type {
  ImportRelationMappingMode,
  ImportUniqueConflictStrategyMode,
} from '@/services/api.import.service'
import type { SaplingGenericItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'

type RelationMappingModeOption = {
  title: string
  value: ImportRelationMappingMode
}

type UniqueConflictStrategyOption = {
  title: string
  value: ImportUniqueConflictStrategyMode
}

const props = defineProps<{
  hasBatch: boolean
  fields: EntityTemplate[]
  fieldMappings: Record<string, string | null>
  fieldDefaults: Record<string, unknown>
  relationMappingModes: Record<string, ImportRelationMappingMode | null>
  relationMappingColumns: Record<string, string[]>
  relationMappingModeOptions: RelationMappingModeOption[]
  uniqueConflictStrategies: Record<string, ImportUniqueConflictStrategyMode>
  uniqueConflictStrategyOptions: UniqueConflictStrategyOption[]
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
  (event: 'updateFieldMapping', targetField: string, value: string | null): void
  (event: 'updateFieldDefault', targetField: string, value: unknown): void
  (
    event: 'updateUniqueConflictStrategy',
    targetField: string,
    value: ImportUniqueConflictStrategyMode,
  ): void
  (
    event: 'updateRelationMappingMode',
    targetField: string,
    value: ImportRelationMappingMode | null,
  ): void
  (event: 'updateRelationMappingColumns', targetField: string, value: string[]): void
}>()

const { t } = useI18n()

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function updateFieldMapping(targetField: string, value: unknown): void {
  emit('updateFieldMapping', targetField, normalizeNullableString(value))
  emit('fieldMappingChange', targetField)
}

function updateFieldDefault(targetField: string, value: unknown): void {
  emit('updateFieldDefault', targetField, value)
}

function updateUniqueConflictStrategy(targetField: string, value: unknown): void {
  const normalizedValue = props.uniqueConflictStrategyOptions.some(
    (option) => option.value === value,
  )
    ? (value as ImportUniqueConflictStrategyMode)
    : 'error'
  emit('updateUniqueConflictStrategy', targetField, normalizedValue)
}

function updateRelationMappingMode(targetField: string, value: unknown): void {
  const normalizedValue = props.relationMappingModeOptions.some((option) => option.value === value)
    ? (value as ImportRelationMappingMode)
    : null
  emit('updateRelationMappingMode', targetField, normalizedValue)
}

function updateRelationMappingColumns(targetField: string, value: unknown): void {
  emit('updateRelationMappingColumns', targetField, normalizeStringArray(value))
  emit('normalizeRelationMappingColumns', targetField)
}

function isUniqueConflictField(field: EntityTemplate): boolean {
  return Boolean(
    field.isUnique &&
    !field.isPrimaryKey &&
    !field.isReference &&
    ['string', 'text', 'varchar'].includes(field.type),
  )
}
</script>
