<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--uniform-inset sapling-import"
    fluid
  >
    <SaplingPageHero
      variant="system"
      :eyebrow="$t('navigation.import')"
      :title="$t('import.title')"
    >
      <p>{{ $t('import.subtitle') }}</p>

      <template #meta>
        <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-table-arrow-up">
          {{ batch?.status ? importStatusLabel(batch.status) : '-' }}
        </v-chip>
        <v-chip size="small" variant="outlined" prepend-icon="mdi-table-row">
          {{ batch?.rowCount ?? 0 }}
        </v-chip>
        <v-chip size="small" variant="outlined" prepend-icon="mdi-alert-outline">
          {{ batch?.errorCount ?? 0 }}
        </v-chip>
      </template>

      <template #side>
        <div class="sapling-action-cluster">
          <v-btn
            :color="executeButtonColor"
            prepend-icon="mdi-play"
            :disabled="!canExecute"
            :loading="isExecuting"
            @click="executeBatch"
          >
            {{ executeButtonLabel }}
          </v-btn>
          <v-btn
            v-if="hasErrorReportRows"
            color="warning"
            variant="tonal"
            prepend-icon="mdi-file-download-outline"
            :loading="isDownloadingErrorReport"
            @click="downloadErrorReport"
          >
            {{ $t('import.downloadErrorReport') }}
          </v-btn>
        </div>
      </template>
    </SaplingPageHero>

    <section class="sapling-import__workspace">
      <SaplingSurface class="sapling-panel-shell sapling-section-panel sapling-import__panel">
        <div class="sapling-import__toolbar">
          <v-file-input
            v-model="selectedFile"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            prepend-icon=""
            prepend-inner-icon="mdi-file-delimited-outline"
            density="comfortable"
            :label="$t('import.selectFile')"
            :disabled="isAnalyzing"
            :loading="isAnalyzing"
            @update:model-value="analyzeSelectedFile"
          />
          <v-autocomplete
            v-model="selectedOpenBatchHandle"
            :items="openBatchOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-tray-arrow-down"
            density="comfortable"
            clearable
            :label="$t('import.openBatch')"
            :disabled="isAnalyzing || isLoadingOpenBatches"
            :loading="isLoadingOpenBatches"
            autocomplete="off"
            @update:model-value="loadSelectedOpenBatch"
          />
          <v-autocomplete
            v-model="selectedEntityHandle"
            :items="entityOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-table"
            density="comfortable"
            :label="$t('import.targetEntity')"
            :disabled="!batch"
            @update:model-value="onEntityChange"
            autocomplete="off"
          />
          <v-autocomplete
            v-model="selectedSourceHandle"
            :items="sourceOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-database"
            density="comfortable"
            clearable
            :label="$t('import.source')"
            :disabled="!batch"
            autocomplete="off"
          />
          <v-autocomplete
            v-model="selectedTemplateHandle"
            :items="templateOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-table-cog"
            density="comfortable"
            clearable
            :label="$t('import.template')"
            :disabled="!canUseTemplates"
            :loading="isLoadingTemplates"
            autocomplete="off"
          />
        </div>

        <div v-if="batch" class="sapling-import__settings">
          <v-text-field
            v-model="templateTitle"
            density="comfortable"
            prepend-inner-icon="mdi-label-outline"
            :label="$t('import.templateTitle')"
            :disabled="!canUseTemplates"
            autocomplete="off"
          />
          <v-select
            v-model="externalKeyColumns"
            :items="headerOptions"
            chips
            multiple
            clearable
            density="comfortable"
            prepend-inner-icon="mdi-key-chain"
            :label="$t('import.externalKeyColumns')"
            :disabled="!selectedSourceHandle"
            autocomplete="off"
            counter
            @update:model-value="normalizeExternalKeyColumns"
          />
          <template v-if="hasGenericReference">
            <v-autocomplete
              v-model="genericReferenceEntityHandle"
              :items="entityOptions"
              item-title="title"
              item-value="value"
              density="comfortable"
              prepend-inner-icon="mdi-link-variant"
              :label="$t('import.genericReferenceTarget')"
              autocomplete="off"
            />
            <v-select
              v-model="genericReferenceKeyColumns"
              :items="headerOptions"
              chips
              multiple
              clearable
              density="comfortable"
              prepend-inner-icon="mdi-key"
              :label="$t('import.externalKeyColumns')"
              :disabled="!genericReferenceEntityHandle || !selectedSourceHandle"
              autocomplete="off"
              counter
              @update:model-value="normalizeGenericReferenceKeyColumns"
            />
          </template>
        </div>

        <div v-if="batch && importableFields.length > 0" class="sapling-import__mapping">
          <div
            v-for="field in importableFields"
            :key="field.name"
            class="sapling-import__mapping-row"
          >
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
              @update:model-value="onFieldMappingChange(field.name)"
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
            <v-autocomplete
              v-if="field.isReference && field.referenceName"
              v-model="fieldDefaults[field.name]"
              :items="referenceOptionsForField(field)"
              item-title="title"
              item-value="value"
              density="compact"
              hide-details
              clearable
              :placeholder="$t('import.defaultValue')"
              autocomplete="off"
              @focus="loadReferenceValueItems(field.referenceName)"
            />
            <v-select
              v-else-if="customFieldOptionsForField(field).length > 0"
              v-model="fieldDefaults[field.name]"
              :items="customFieldOptionsForField(field)"
              item-title="label"
              item-value="value"
              density="compact"
              hide-details
              clearable
              :multiple="field.customField?.type === 'multiSelect'"
              :chips="field.customField?.type === 'multiSelect'"
              :placeholder="$t('import.defaultValue')"
              autocomplete="off"
            />
            <v-text-field
              v-else
              v-model="fieldDefaults[field.name]"
              density="compact"
              hide-details
              clearable
              :placeholder="$t('import.defaultValue')"
              autocomplete="off"
            />
            <div class="sapling-import__value-mapping-action">
              <v-tooltip :text="$t('import.valueMapping')">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-swap-horizontal"
                    size="small"
                    variant="tonal"
                    :color="hasValueMapping(field.name) ? 'primary' : undefined"
                    :disabled="!fieldMappings[field.name]"
                    :aria-label="$t('import.valueMapping')"
                    @click="openValueMapping(field)"
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
                :placeholder="$t('import.relationMapping')"
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
                :disabled="!relationMappingModes[field.name]"
                :placeholder="$t('import.externalKeyColumns')"
                autocomplete="off"
                @update:model-value="normalizeRelationMappingColumns(field.name)"
              />
            </div>
          </div>
        </div>

        <div v-if="batch" class="sapling-import__actions">
          <v-btn
            variant="tonal"
            prepend-icon="mdi-auto-fix"
            :disabled="!canSuggestWithAi"
            :loading="isSuggesting"
            @click="createAiSuggestion"
          >
            {{ $t('import.createAiSuggestion') }}
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-table-cog"
            :disabled="!selectedTemplate"
            @click="applySelectedTemplate"
          >
            {{ $t('import.loadTemplate') }}
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-content-save-check-outline"
            :disabled="!canSaveTemplate"
            :loading="isSavingTemplate"
            @click="saveTemplate"
          >
            {{ $t('import.saveTemplate') }}
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-check-circle-outline"
            :disabled="!canConfigure"
            :loading="isConfiguring"
            @click="configureBatch"
          >
            {{ $t('import.configure') }}
          </v-btn>
        </div>

        <v-alert
          v-if="aiSuggestion"
          type="info"
          variant="tonal"
          density="comfortable"
          class="sapling-import__ai-suggestion"
        >
          <div class="sapling-import__ai-suggestion-title">
            {{ $t('import.aiSuggestionApplied') }}
          </div>
          <div class="sapling-import__ai-suggestion-chips">
            <v-chip size="small" variant="tonal">
              {{ aiSuggestion.mappings.length }} {{ $t('import.aiSuggestedFields') }}
            </v-chip>
            <v-chip v-if="aiSuggestion.externalKey?.columns.length" size="small" variant="tonal">
              {{ $t('import.externalKeyColumns') }}:
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
              {{ fieldLabel(mapping.targetField) }}: {{ $t('import.valueMapping') }}
            </v-chip>
          </div>
          <div v-if="aiSuggestion.warnings.length" class="sapling-import__ai-warnings">
            <span v-for="warning in aiSuggestion.warnings" :key="warning">{{ warning }}</span>
          </div>
        </v-alert>
      </SaplingSurface>

      <SaplingSurface class="sapling-panel-shell sapling-section-panel sapling-import__panel">
        <div class="sapling-import__summary">
          <v-chip color="success" variant="tonal" prepend-icon="mdi-check">
            {{ batch?.readyCount ?? 0 }} {{ $t('import.readyRows') }}
          </v-chip>
          <v-chip color="warning" variant="tonal" prepend-icon="mdi-alert">
            {{ batch?.errorCount ?? 0 }} {{ $t('import.errorRows') }}
          </v-chip>
          <v-chip variant="outlined" prepend-icon="mdi-plus-circle-outline">
            {{ batch?.createdCount ?? 0 }} {{ $t('import.createdRows') }}
          </v-chip>
          <v-chip variant="outlined" prepend-icon="mdi-pencil-outline">
            {{ batch?.updatedCount ?? 0 }} {{ $t('import.updatedRows') }}
          </v-chip>
        </div>

        <div class="sapling-import__preview-scroll">
          <v-alert
            v-if="isPreviewLimited"
            density="compact"
            type="info"
            variant="tonal"
            class="sapling-import__preview-note"
          >
            {{
              $t('import.previewLimited', {
                count: IMPORT_PREVIEW_ROW_LIMIT,
                total: batch?.rowCount ?? batch?.rows.length ?? 0,
              })
            }}
          </v-alert>

          <div v-if="saplingPreviewItems.length > 0" class="sapling-import__sapling-preview">
            <div class="sapling-section-header">
              <div>
                <p class="sapling-eyebrow">{{ $t('import.saplingPreview') }}</p>
                <h2 class="sapling-section-title">{{ entityPreviewTitle }}</h2>
              </div>
            </div>
            <SaplingTable
              :items="saplingPreviewItems"
              search=""
              :page="1"
              :items-per-page="3"
              :total-items="saplingPreviewItems.length"
              :is-loading="false"
              :sort-by="[]"
              :column-filters="{}"
              :entity-handle="selectedEntityHandle ?? ''"
              :entity="selectedEntity"
              :entity-permission="selectedEntityPermission"
              :entity-templates="selectedEntityTemplates"
              :show-actions="false"
              :show-add="false"
              :show-favorite="false"
              :show-import="false"
              :show-form-config="false"
              :show-search="false"
              :show-toolbar="false"
              :row-interaction="false"
              :table-key="`import-preview-${selectedEntityHandle ?? 'none'}-${batch?.handle ?? 'new'}`"
              disable-mobile-view
              @update:search="noop"
              @update:page="noop"
              @update:items-per-page="noop"
              @update:sort-by="noop"
              @update:column-filters="noop"
              @reload="noop"
              @update:selected="noop"
            />
          </div>

          <v-table v-if="previewRows.length > 0" density="compact" class="sapling-import__table">
            <thead>
              <tr>
                <th>{{ $t('importBatchRow.rowNumber') }}</th>
                <th>{{ $t('importBatchRow.status') }}</th>
                <th>{{ $t('importBatchRow.action') }}</th>
                <th>{{ $t('importBatchRow.targetReference') }}</th>
                <th>{{ $t('importBatchRow.message') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in previewRows" :key="row.rowNumber">
                <td>{{ row.rowNumber }}</td>
                <td>
                  <v-chip size="small" :color="row.status === 'error' ? 'warning' : 'primary'">
                    {{ importStatusLabel(row.status) }}
                  </v-chip>
                </td>
                <td>{{ row.action ? importActionLabel(row.action) : '-' }}</td>
                <td>{{ row.targetReference ?? '-' }}</td>
                <td>{{ importMessageLabel(row.message) }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-table
            v-else-if="sampleHeaders.length > 0"
            density="compact"
            class="sapling-import__table"
          >
            <thead>
              <tr>
                <th v-for="header in sampleHeaders" :key="header">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in batch?.sampleRows ?? []" :key="index">
                <td v-for="header in sampleHeaders" :key="header">
                  {{ row[header] ?? '' }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </SaplingSurface>
    </section>

    <v-dialog v-model="valueMappingDialog.visible" max-width="900">
      <v-card
        v-if="currentValueMapping && currentValueMappingField"
        class="sapling-import__value-mapping-dialog glass-panel"
      >
        <v-card-title class="sapling-section-header">
          <div>
            <p class="sapling-eyebrow">{{ $t('import.valueMapping') }}</p>
            <h2 class="sapling-section-title">{{ fieldLabel(currentValueMappingField.name) }}</h2>
          </div>
        </v-card-title>
        <v-card-text class="sapling-import__value-mapping-body">
          <v-select
            v-model="currentValueMapping.fallback"
            :items="valueMappingFallbackOptions"
            item-title="title"
            item-value="value"
            density="comfortable"
            prepend-inner-icon="mdi-call-split"
            :label="$t('import.valueMappingFallback')"
            autocomplete="off"
          />

          <v-table density="compact" class="sapling-import__table">
            <thead>
              <tr>
                <th>{{ $t('import.sourceValue') }}</th>
                <th>{{ $t('import.targetValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sourceValue in currentValueMappingSourceValues" :key="sourceValue">
                <td>{{ sourceValue }}</td>
                <td>
                  <v-autocomplete
                    v-if="isCurrentValueMappingReference"
                    v-model="currentValueMapping.values[sourceValue]"
                    :items="currentValueMappingReferenceOptions"
                    item-title="title"
                    item-value="value"
                    density="compact"
                    hide-details
                    clearable
                    :loading="valueMappingDialog.isLoadingReferenceItems"
                    :placeholder="$t('import.targetValue')"
                    autocomplete="off"
                  />
                  <v-text-field
                    v-else
                    v-model="currentValueMapping.values[sourceValue]"
                    density="compact"
                    hide-details
                    clearable
                    :placeholder="$t('import.targetValue')"
                    autocomplete="off"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <p v-if="currentValueMappingSourceValues.length === 0" class="sapling-muted-text">
            {{ $t('import.valueMappingNoValues') }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-delete-outline" @click="clearCurrentValueMapping">
            {{ $t('import.clearValueMapping') }}
          </v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="closeValueMapping">
            {{ $t('global.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingTable from '@/components/table/SaplingTable.vue'
import { useGenericStore } from '@/stores/genericStore'
import ApiGenericService from '@/services/api.generic.service'
import ApiImportService, {
  type ImportAiSuggestion,
  type ImportBatchRowSummary,
  type ImportBatchSummary,
  type ImportFieldDefault,
  type ImportFieldMapping,
  type ImportGenericReferenceMapping,
  type ImportRelationMapping,
  type ImportRelationMappingMode,
  type ImportTemplateSummary,
  type ImportValueMapping,
  type ImportValueMappingFallback,
  type SaveImportTemplatePayload,
} from '@/services/api.import.service'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { getEntityValueLabel } from '@/utils/saplingTableUtil'
import { downloadTextFile } from '@/composables/table/saplingTableAction.utils'

type Option = { title: string; value: string }
type BatchOption = { title: string; value: number }
type ValueOption = { title: string; value: unknown }
type ErrorReportRow = ImportBatchRowSummary & { rawData: Record<string, unknown> }
type ImportSource = SaplingGenericItem & { handle: string; title?: string; isActive?: boolean }
type ValueMappingState = {
  targetField: string
  values: Record<string, unknown>
  fallback: ImportValueMappingFallback
}
type ImportMappingConfiguration =
  | {
      mappings?: ImportFieldMapping[]
      fieldDefaults?: ImportFieldDefault[]
      relationMappings?: ImportRelationMapping[]
      valueMappings?: ImportValueMapping[]
    }
  | null
  | undefined

const { t, te } = useI18n()
const genericStore = useGenericStore()
const { pushMessage } = useSaplingMessageCenter()
const { loadTranslations } = useTranslationLoader(
  'global',
  'navigation',
  'system',
  'import',
  'importBatch',
  'importBatchRow',
  'importSource',
  'importTemplate',
  'externalRecordLink',
)

const IMPORT_PREVIEW_ROW_LIMIT = 100
const IMPORT_ERROR_REPORT_DELIMITER = ';'
const IMPORT_ERROR_REPORT_BOM = '\uFEFF'
const IMPORT_REQUIRED_FIELDS_MISSING_PREFIX = 'import.requiredFieldsMissing:'
const selectedFile = ref<File | File[] | null>(null)
const selectedEntityHandle = ref<string | null>(null)
const selectedSourceHandle = ref<string | null>(null)
const selectedTemplateHandle = ref<number | string | null>(null)
const selectedOpenBatchHandle = ref<number | null>(null)
const templateTitle = ref('')
const externalKeyColumns = ref<string[]>([])
const genericReferenceEntityHandle = ref<string | null>(null)
const genericReferenceKeyColumns = ref<string[]>([])
const batch = ref<ImportBatchSummary | null>(null)
const openBatches = ref<ImportBatchSummary[]>([])
const entities = ref<EntityItem[]>([])
const sources = ref<ImportSource[]>([])
const templates = ref<ImportTemplateSummary[]>([])
const isAnalyzing = ref(false)
const isConfiguring = ref(false)
const isExecuting = ref(false)
const isLoadingTemplates = ref(false)
const isSavingTemplate = ref(false)
const isSuggesting = ref(false)
const isLoadingOpenBatches = ref(false)
const isHydratingBatch = ref(false)
const isDownloadingErrorReport = ref(false)
const aiSuggestion = ref<ImportAiSuggestion | null>(null)
const fieldMappings = reactive<Record<string, string | null>>({})
const fieldDefaults = reactive<Record<string, unknown>>({})
const relationMappingModes = reactive<Record<string, ImportRelationMappingMode | null>>({})
const relationMappingColumns = reactive<Record<string, string[]>>({})
const valueMappings = reactive<Record<string, ValueMappingState>>({})
const aiSuggestionFieldDetails = reactive<
  Record<string, { confidence: number; reason: string | null }>
>({})
const referenceValueItems = reactive<Record<string, SaplingGenericItem[]>>({})
const valueMappingDialog = reactive<{
  visible: boolean
  targetField: string | null
  isLoadingReferenceItems: boolean
}>({
  visible: false,
  targetField: null,
  isLoadingReferenceItems: false,
})

const selectedEntityTemplates = computed<EntityTemplate[]>(() => {
  if (!selectedEntityHandle.value) {
    return []
  }
  return genericStore.getState(selectedEntityHandle.value).entityTemplates
})

const selectedEntity = computed<EntityItem | null>(() => {
  if (!selectedEntityHandle.value) {
    return null
  }
  return genericStore.getState(selectedEntityHandle.value).entity
})

const selectedEntityPermission = computed<AccumulatedPermission | null>(() => {
  if (!selectedEntityHandle.value) {
    return null
  }
  return genericStore.getState(selectedEntityHandle.value).entityPermission
})

const importableFields = computed(() =>
  selectedEntityTemplates.value.filter((template) => {
    if (!template.name || template.name === 'handle') {
      return Boolean(template.name)
    }
    if (template.isPersistent === false || template.options?.includes('isReadOnly')) {
      return false
    }
    return !['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind ?? '')
  }),
)

const entityOptions = computed<Option[]>(() =>
  entities.value
    .filter((entity) => entity.canRead !== false)
    .map((entity) => ({
      title: entityLabel(entity.handle),
      value: entity.handle,
    }))
    .sort((left, right) => left.title.localeCompare(right.title)),
)

const sourceOptions = computed<Option[]>(() =>
  sources.value
    .filter((source) => source.isActive !== false)
    .map((source) => ({ title: source.title || source.handle, value: source.handle })),
)

const templateOptions = computed(() =>
  templates.value.map((template) => ({
    title: template.title,
    value: template.handle,
  })),
)
const openBatchOptions = computed<BatchOption[]>(() =>
  openBatches.value
    .filter((entry) => typeof entry.handle === 'number')
    .map((entry) => ({
      title: [
        `#${entry.handle}`,
        entry.filename,
        importStatusLabel(entry.status),
        entry.entityHandle ? entityLabel(entry.entityHandle) : null,
      ]
        .filter(Boolean)
        .join(' - '),
      value: entry.handle as number,
    })),
)

const selectedTemplate = computed(
  () =>
    templates.value.find(
      (template) =>
        template.handle != null &&
        selectedTemplateHandle.value != null &&
        String(template.handle) === String(selectedTemplateHandle.value),
    ) ?? null,
)

const headerOptions = computed(() => batch.value?.headers ?? [])
const sampleHeaders = computed(() => batch.value?.headers.slice(0, 8) ?? [])
const previewRows = computed(() => batch.value?.rows.slice(0, IMPORT_PREVIEW_ROW_LIMIT) ?? [])
const errorReportRows = computed<ErrorReportRow[]>(() =>
  (batch.value?.rows ?? []).filter(
    (row): row is ErrorReportRow =>
      (row.status === 'error' || row.status === 'failed') &&
      Boolean(row.rawData) &&
      typeof row.rawData === 'object',
  ),
)
const saplingPreviewItems = computed<SaplingGenericItem[]>(() =>
  (batch.value?.rows ?? [])
    .filter((row) => row.payload && row.status !== 'error' && row.status !== 'failed')
    .slice(0, 3)
    .map((row) => ({
      ...(row.payload ?? {}),
      handle: row.payload?.handle ?? `preview-${row.rowNumber}`,
    })),
)
const entityPreviewTitle = computed(() =>
  selectedEntityHandle.value ? entityLabel(selectedEntityHandle.value) : t('import.targetEntity'),
)
const hasGenericReference = computed(() =>
  selectedEntityTemplates.value.some((template) => template.genericReference),
)
const currentValueMappingField = computed(() =>
  importableFields.value.find((field) => field.name === valueMappingDialog.targetField),
)
const currentValueMapping = computed(() =>
  valueMappingDialog.targetField ? valueMappings[valueMappingDialog.targetField] : null,
)
const currentValueMappingSourceValues = computed(() =>
  currentValueMappingField.value ? sourceValuesForField(currentValueMappingField.value) : [],
)
const currentValueMappingReferenceOptions = computed(() =>
  currentValueMappingField.value
    ? referenceOptionsForField(currentValueMappingField.value)
    : ([] as ValueOption[]),
)
const isCurrentValueMappingReference = computed(
  () =>
    Boolean(currentValueMappingField.value?.isReference) &&
    Boolean(currentValueMappingField.value?.referenceName),
)
const valueMappingFallbackOptions = computed(() => [
  { title: t('import.valueMappingFallback.keep'), value: 'keep' },
  { title: t('import.valueMappingFallback.empty'), value: 'empty' },
  { title: t('import.valueMappingFallback.error'), value: 'error' },
])
const relationMappingModeOptions = computed(() => [
  { title: t('import.relationMappingMode.handle'), value: 'handle' },
  { title: t('import.relationMappingMode.value'), value: 'value' },
  { title: t('import.relationMappingMode.externalKey'), value: 'externalKey' },
])
const canConfigure = computed(
  () => Boolean(batch.value?.handle && selectedEntityHandle.value) && !isConfiguring.value,
)
const canUseTemplates = computed(() =>
  Boolean(batch.value?.handle && selectedEntityHandle.value && selectedSourceHandle.value),
)
const canSaveTemplate = computed(
  () =>
    canUseTemplates.value &&
    templateTitle.value.trim().length > 0 &&
    (Object.values(fieldMappings).some(Boolean) ||
      Object.values(fieldDefaults).some(hasFieldDefaultValue) ||
      Object.values(relationMappingModes).some(Boolean)) &&
    !isSavingTemplate.value,
)
const canSuggestWithAi = computed(
  () => Boolean(batch.value?.handle && selectedEntityHandle.value) && !isSuggesting.value,
)
const hasValidationErrors = computed(() => (batch.value?.errorCount ?? 0) > 0)
const hasErrorReportRows = computed(
  () =>
    errorReportRows.value.length > 0 ||
    (batch.value?.errorCount ?? 0) > 0 ||
    (batch.value?.failedCount ?? 0) > 0,
)
const isPreviewLimited = computed(
  () => (batch.value?.rowCount ?? batch.value?.rows.length ?? 0) > IMPORT_PREVIEW_ROW_LIMIT,
)
const executeButtonLabel = computed(() =>
  hasValidationErrors.value ? t('import.executeWithoutInvalidRows') : t('import.execute'),
)
const executeButtonColor = computed(() => (hasValidationErrors.value ? 'warning' : 'primary'))
const canExecute = computed(
  () =>
    Boolean(batch.value?.handle) &&
    (batch.value?.readyCount ?? 0) > 0 &&
    (batch.value?.status === 'validated' || batch.value?.status === 'validatedWithErrors') &&
    !isExecuting.value,
)

onMounted(async () => {
  await Promise.all([loadTranslations(), loadEntities(), loadSources(), loadOpenBatches()])
})

watch(selectedEntityHandle, async (entityHandle) => {
  if (isHydratingBatch.value) {
    return
  }

  if (!entityHandle) {
    templates.value = []
    return
  }
  await genericStore.loadGeneric(entityHandle, 'global', 'import')
  initializeMappings()
  await loadTemplates()
})

watch(selectedSourceHandle, async () => {
  if (isHydratingBatch.value) {
    return
  }

  selectedTemplateHandle.value = null
  await loadTemplates()
})

watch(selectedTemplate, (template) => {
  if (!isHydratingBatch.value && template) {
    applyTemplate(template)
  }
})

async function loadEntities(): Promise<void> {
  const response = await ApiGenericService.find<EntityItem>('entity', {
    limit: DEFAULT_ENTITY_ITEMS_COUNT,
    orderBy: { handle: 'ASC' },
  })
  entities.value = response.data
}

async function loadSources(): Promise<void> {
  const response = await ApiGenericService.find<ImportSource>('importSource', {
    limit: DEFAULT_ENTITY_ITEMS_COUNT,
    orderBy: { title: 'ASC' },
  })
  sources.value = response.data
}

async function loadTemplates(): Promise<void> {
  if (!selectedEntityHandle.value || !selectedSourceHandle.value) {
    templates.value = []
    selectedTemplateHandle.value = null
    return
  }

  try {
    isLoadingTemplates.value = true
    templates.value = await ApiImportService.listTemplates({
      entityHandle: selectedEntityHandle.value,
      sourceHandle: selectedSourceHandle.value,
    })
  } finally {
    isLoadingTemplates.value = false
  }
}

async function loadOpenBatches(): Promise<void> {
  try {
    isLoadingOpenBatches.value = true
    openBatches.value = await ApiImportService.listOpenBatches()
  } finally {
    isLoadingOpenBatches.value = false
  }
}

async function analyzeSelectedFile(value: File | File[] | null): Promise<void> {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) {
    return
  }

  try {
    isAnalyzing.value = true
    selectedOpenBatchHandle.value = null
    batch.value = await ApiImportService.analyzeCsv(file)
    initializeMappings()
    await loadOpenBatches()
    pushMessage('success', t('import.analysisCompleted'), file.name, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isAnalyzing.value = false
  }
}

async function loadSelectedOpenBatch(value: number | string | null): Promise<void> {
  const handle = Number(value)
  if (!Number.isFinite(handle)) {
    return
  }

  try {
    isLoadingOpenBatches.value = true
    const loadedBatch = await ApiImportService.getBatch(Math.trunc(handle))
    await hydrateBatchState(loadedBatch)
    pushMessage('success', t('import.openBatchLoaded'), loadedBatch.filename, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isLoadingOpenBatches.value = false
  }
}

async function hydrateBatchState(loadedBatch: ImportBatchSummary): Promise<void> {
  isHydratingBatch.value = true

  try {
    batch.value = loadedBatch
    selectedFile.value = null
    selectedEntityHandle.value = loadedBatch.entityHandle ?? null
    selectedSourceHandle.value = loadedBatch.sourceHandle ?? null
    selectedTemplateHandle.value = loadedBatch.templateHandle ?? null
    templateTitle.value = ''

    if (selectedEntityHandle.value) {
      await Promise.all([
        genericStore.loadGeneric(selectedEntityHandle.value, 'global', 'import'),
        loadTranslations(),
      ])
    }

    await loadTemplates()
    initializeMappings()
    applyMappingConfiguration(loadedBatch.mapping)
    externalKeyColumns.value = filterExistingColumns(loadedBatch.externalKeyColumns ?? [])

    const genericReferenceMapping = normalizeGenericReferenceMapping(
      loadedBatch.genericReferenceMapping,
    )
    genericReferenceEntityHandle.value = genericReferenceMapping?.entityHandle ?? null
    genericReferenceKeyColumns.value = filterExistingColumns(
      genericReferenceMapping?.keyColumns ?? [],
    )
  } finally {
    isHydratingBatch.value = false
  }
}

async function onEntityChange(): Promise<void> {
  if (selectedEntityHandle.value) {
    await Promise.all([
      genericStore.loadGeneric(selectedEntityHandle.value, 'global', 'import'),
      loadTranslations(),
    ])
  }
  initializeMappings()
}

function initializeMappings(): void {
  resetAiSuggestion()
  Object.keys(fieldMappings).forEach((key) => delete fieldMappings[key])
  Object.keys(fieldDefaults).forEach((key) => delete fieldDefaults[key])
  Object.keys(relationMappingModes).forEach((key) => delete relationMappingModes[key])
  Object.keys(relationMappingColumns).forEach((key) => delete relationMappingColumns[key])
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])

  for (const field of importableFields.value) {
    const matchedHeader = headerOptions.value.find(
      (header) => normalizeName(header) === normalizeName(field.name),
    )
    fieldMappings[field.name] = matchedHeader ?? null
    fieldDefaults[field.name] = null
    if (field.isReference && field.referenceName) {
      relationMappingModes[field.name] = null
      relationMappingColumns[field.name] = []
    }
  }
}

function applySelectedTemplate(): void {
  const template = selectedTemplate.value
  if (!template) {
    return
  }

  applyTemplate(template)
  pushMessage('success', t('import.templateLoaded'), template.title, 'import')
}

function applyTemplate(template: ImportTemplateSummary): void {
  resetAiSuggestion()
  applyMappingConfiguration(template.mapping)

  externalKeyColumns.value = filterExistingColumns(template.externalKeyColumns ?? [])
  const genericReferenceMapping = template.genericReferenceMapping
  genericReferenceEntityHandle.value = genericReferenceMapping?.entityHandle ?? null
  genericReferenceKeyColumns.value = filterExistingColumns(
    genericReferenceMapping?.keyColumns ?? [],
  )
  templateTitle.value = template.title
}

async function createAiSuggestion(): Promise<void> {
  if (!batch.value?.handle || !selectedEntityHandle.value) {
    return
  }

  try {
    isSuggesting.value = true
    const suggestion = await ApiImportService.suggestBatchConfiguration(batch.value.handle, {
      entityHandle: selectedEntityHandle.value,
      sourceHandle: selectedSourceHandle.value,
    })
    applyAiSuggestion(suggestion)
    pushMessage('success', t('import.aiSuggestionCreated'), batch.value.filename, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isSuggesting.value = false
  }
}

function applyAiSuggestion(suggestion: ImportAiSuggestion): void {
  resetAiSuggestion()
  aiSuggestion.value = suggestion

  for (const mapping of suggestion.mappings) {
    if (
      !headerOptions.value.includes(mapping.sourceColumn) ||
      !(mapping.targetField in fieldMappings)
    ) {
      continue
    }

    fieldMappings[mapping.targetField] = mapping.sourceColumn
    aiSuggestionFieldDetails[mapping.targetField] = {
      confidence: mapping.confidence,
      reason: mapping.reason ?? null,
    }
  }

  if (selectedSourceHandle.value && suggestion.externalKey?.columns.length) {
    externalKeyColumns.value = filterExistingColumns(suggestion.externalKey.columns)
  }

  for (const mapping of suggestion.valueMappings) {
    if (!fieldMappings[mapping.targetField]) {
      continue
    }

    valueMappings[mapping.targetField] = {
      targetField: mapping.targetField,
      values: { ...(mapping.values ?? {}) },
      fallback: normalizeValueMappingFallback(mapping.fallback),
    }
  }
}

function resetAiSuggestion(): void {
  aiSuggestion.value = null
  Object.keys(aiSuggestionFieldDetails).forEach((key) => delete aiSuggestionFieldDetails[key])
}

async function configureBatch(): Promise<void> {
  if (!batch.value?.handle || !selectedEntityHandle.value) {
    return
  }

  try {
    isConfiguring.value = true
    batch.value = await ApiImportService.configureBatch(batch.value.handle, buildTemplatePayload())
    applyValueMappings(batch.value.mapping)
    await loadOpenBatches()
    pushMessage('success', t('import.validationCompleted'), batch.value.filename, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isConfiguring.value = false
  }
}

async function saveTemplate(): Promise<void> {
  if (!selectedEntityHandle.value || !selectedSourceHandle.value || !templateTitle.value.trim()) {
    return
  }

  const payload: SaveImportTemplatePayload = {
    ...buildTemplatePayload(),
    handle: getSelectedTemplateHandleNumber(),
    title: templateTitle.value.trim(),
    isActive: true,
  }

  try {
    isSavingTemplate.value = true
    const existingHandle = getSelectedTemplateHandleNumber()
    const savedTemplate = existingHandle
      ? await ApiImportService.updateTemplate(existingHandle, payload)
      : await ApiImportService.saveTemplate(payload)
    await loadTemplates()
    selectedTemplateHandle.value = savedTemplate.handle
    templateTitle.value = savedTemplate.title
    applyValueMappings(savedTemplate.mapping)
    pushMessage('success', t('import.templateSaved'), savedTemplate.title, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isSavingTemplate.value = false
  }
}

async function executeBatch(): Promise<void> {
  if (!batch.value?.handle) {
    return
  }

  try {
    isExecuting.value = true
    batch.value = await ApiImportService.executeBatch(batch.value.handle)
    await loadOpenBatches()
    pushMessage('success', t('import.executionCompleted'), batch.value.filename, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isExecuting.value = false
  }
}

async function downloadErrorReport(): Promise<void> {
  if (!batch.value) {
    return
  }

  try {
    isDownloadingErrorReport.value = true
    const rows = batch.value.handle
      ? await ApiImportService.getBatchErrorRows(batch.value.handle)
      : errorReportRows.value

    if (rows.length === 0) {
      return
    }

    downloadTextFile(
      buildErrorReportCsv(rows),
      createErrorReportFilename(batch.value.filename),
      'text/csv;charset=utf-8',
    )
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isDownloadingErrorReport.value = false
  }
}

function buildErrorReportCsv(rows: ImportBatchRowSummary[]): string {
  const rawHeaders = collectErrorReportRawHeaders(rows)
  const headers = [
    'rowNumber',
    'status',
    'action',
    'targetReference',
    'message',
    'messageKey',
    'externalKeyHash',
    ...rawHeaders.map((header) => `raw.${header}`),
  ]
  const lines = [
    headers.map(escapeImportCsvCell).join(IMPORT_ERROR_REPORT_DELIMITER),
    ...rows.map((row) =>
      [
        row.rowNumber,
        importStatusLabel(row.status),
        row.action ? importActionLabel(row.action) : '',
        row.targetReference ?? '',
        importMessageLabel(row.message),
        row.message ?? '',
        row.externalKeyHash ?? '',
        ...rawHeaders.map((header) => row.rawData[header] ?? ''),
      ]
        .map(escapeImportCsvCell)
        .join(IMPORT_ERROR_REPORT_DELIMITER),
    ),
  ]

  return `${IMPORT_ERROR_REPORT_BOM}${lines.join('\r\n')}\r\n`
}

function normalizeExternalKeyColumns(): void {
  externalKeyColumns.value = normalizeSelectedColumns(externalKeyColumns.value)
}

function normalizeGenericReferenceKeyColumns(): void {
  genericReferenceKeyColumns.value = normalizeSelectedColumns(genericReferenceKeyColumns.value)
}

function normalizeRelationMappingColumns(targetField: string): void {
  relationMappingColumns[targetField] = normalizeSelectedColumns(
    relationMappingColumns[targetField] ?? [],
  )
}

function buildTemplatePayload(): SaveImportTemplatePayload {
  return {
    entityHandle: selectedEntityHandle.value ?? '',
    sourceHandle: selectedSourceHandle.value,
    templateHandle: getSelectedTemplateHandleNumber(),
    keyColumns: externalKeyColumns.value,
    mappings: buildFieldMappings(),
    fieldDefaults: buildFieldDefaults(),
    relationMappings: buildRelationMappings(),
    valueMappings: buildValueMappings(),
    genericReferenceMapping: buildGenericReferenceMapping(),
    title: templateTitle.value.trim(),
  }
}

function getSelectedTemplateHandleNumber(): number | null {
  if (selectedTemplateHandle.value === null || selectedTemplateHandle.value === '') {
    return null
  }

  const handle = Number(selectedTemplateHandle.value)
  return Number.isFinite(handle) ? Math.trunc(handle) : null
}

function buildFieldMappings(): ImportFieldMapping[] {
  return Object.entries(fieldMappings)
    .filter(([, sourceColumn]) => Boolean(sourceColumn))
    .map(([targetField, sourceColumn]) => ({
      targetField,
      sourceColumn: sourceColumn as string,
    }))
}

function buildFieldDefaults(): ImportFieldDefault[] {
  return Object.entries(fieldDefaults)
    .filter(([, value]) => hasFieldDefaultValue(value))
    .map(([targetField, value]) => ({ targetField, value }))
}

function buildRelationMappings(): ImportRelationMapping[] {
  return Object.entries(relationMappingModes).reduce<ImportRelationMapping[]>(
    (mappings, [targetField, mode]) => {
      const columns = normalizeSelectedColumns(relationMappingColumns[targetField] ?? [])
      if (!mode || columns.length === 0) {
        return mappings
      }

      mappings.push({
        targetField,
        mode,
        sourceColumn: columns[0],
        sourceColumns: mode === 'externalKey' ? columns : [columns[0]],
        sourceHandle: selectedSourceHandle.value,
      })
      return mappings
    },
    [],
  )
}

function buildValueMappings(): ImportValueMapping[] {
  return Object.values(valueMappings)
    .map((mapping) => ({
      targetField: mapping.targetField,
      values: Object.fromEntries(
        Object.entries(mapping.values).filter(([, value]) => value !== null && value !== ''),
      ),
      fallback: normalizeValueMappingFallback(mapping.fallback),
    }))
    .filter((mapping) => Object.keys(mapping.values).length > 0)
}

function applyValueMappings(mappingConfiguration: ImportMappingConfiguration): void {
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])

  for (const mapping of mappingConfiguration?.valueMappings ?? []) {
    if (!mapping.targetField || !fieldMappings[mapping.targetField]) {
      continue
    }

    valueMappings[mapping.targetField] = {
      targetField: mapping.targetField,
      values: { ...(mapping.values ?? {}) },
      fallback: normalizeValueMappingFallback(mapping.fallback),
    }
  }
}

function applyMappingConfiguration(mappingConfiguration: ImportMappingConfiguration): void {
  Object.keys(fieldMappings).forEach((key) => delete fieldMappings[key])
  Object.keys(fieldDefaults).forEach((key) => delete fieldDefaults[key])
  Object.keys(relationMappingModes).forEach((key) => delete relationMappingModes[key])
  Object.keys(relationMappingColumns).forEach((key) => delete relationMappingColumns[key])
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])

  for (const field of importableFields.value) {
    fieldMappings[field.name] = null
    fieldDefaults[field.name] = null
    if (field.isReference && field.referenceName) {
      relationMappingModes[field.name] = null
      relationMappingColumns[field.name] = []
    }
  }

  for (const mapping of mappingConfiguration?.mappings ?? []) {
    if (!mapping.targetField || !mapping.sourceColumn) {
      continue
    }

    fieldMappings[mapping.targetField] = headerOptions.value.includes(mapping.sourceColumn)
      ? mapping.sourceColumn
      : null
  }

  for (const fieldDefault of mappingConfiguration?.fieldDefaults ?? []) {
    if (!fieldDefault.targetField || !(fieldDefault.targetField in fieldDefaults)) {
      continue
    }

    fieldDefaults[fieldDefault.targetField] = fieldDefault.value ?? null
  }

  for (const relationMapping of mappingConfiguration?.relationMappings ?? []) {
    if (
      !relationMapping.targetField ||
      !(relationMapping.targetField in relationMappingModes) ||
      !['handle', 'value', 'externalKey'].includes(relationMapping.mode)
    ) {
      continue
    }

    relationMappingModes[relationMapping.targetField] = relationMapping.mode
    relationMappingColumns[relationMapping.targetField] = filterExistingColumns(
      relationMapping.sourceColumns?.length
        ? relationMapping.sourceColumns
        : relationMapping.sourceColumn
          ? [relationMapping.sourceColumn]
          : [],
    )
  }

  applyValueMappings(mappingConfiguration)
}

function normalizeGenericReferenceMapping(value: unknown): ImportGenericReferenceMapping | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const mapping = value as Partial<ImportGenericReferenceMapping>
  if (!mapping.entityHandle || !Array.isArray(mapping.keyColumns)) {
    return null
  }

  return {
    entityHandle: mapping.entityHandle,
    sourceHandle: mapping.sourceHandle ?? null,
    keyColumns: mapping.keyColumns,
  }
}

function buildGenericReferenceMapping(): ImportGenericReferenceMapping | null {
  if (
    !hasGenericReference.value ||
    !selectedSourceHandle.value ||
    !genericReferenceEntityHandle.value ||
    genericReferenceKeyColumns.value.length === 0
  ) {
    return null
  }

  return {
    entityHandle: genericReferenceEntityHandle.value,
    sourceHandle: selectedSourceHandle.value,
    keyColumns: genericReferenceKeyColumns.value,
  }
}

function onFieldMappingChange(targetField: string): void {
  delete aiSuggestionFieldDetails[targetField]
  const field = importableFields.value.find((entry) => entry.name === targetField)
  const mapping = valueMappings[targetField]
  if (!field || !mapping) {
    return
  }

  const validSourceValues = new Set(sourceValuesForField(field))
  mapping.values = Object.fromEntries(
    Object.entries(mapping.values).filter(([sourceValue]) => validSourceValues.has(sourceValue)),
  )

  if (Object.keys(mapping.values).length === 0) {
    delete valueMappings[targetField]
  }
}

async function openValueMapping(field: EntityTemplate): Promise<void> {
  if (!field.name || !fieldMappings[field.name]) {
    return
  }

  ensureValueMapping(field.name)
  valueMappingDialog.targetField = field.name
  valueMappingDialog.visible = true

  if (field.isReference && field.referenceName) {
    await loadReferenceValueItems(field.referenceName)
  }
}

function closeValueMapping(): void {
  valueMappingDialog.visible = false
  valueMappingDialog.targetField = null
}

function clearCurrentValueMapping(): void {
  if (!valueMappingDialog.targetField) {
    return
  }

  delete valueMappings[valueMappingDialog.targetField]
  closeValueMapping()
}

function ensureValueMapping(targetField: string): ValueMappingState {
  if (!valueMappings[targetField]) {
    valueMappings[targetField] = {
      targetField,
      values: {},
      fallback: 'keep',
    }
  }

  return valueMappings[targetField]
}

function hasValueMapping(targetField: string): boolean {
  const mapping = valueMappings[targetField]
  return Boolean(mapping && Object.keys(mapping.values).length > 0)
}

function getSourceColumnOptionValue(item: unknown): string {
  if (typeof item === 'string') {
    return item
  }

  if (item && typeof item === 'object') {
    const source = item as { raw?: unknown; value?: unknown; title?: unknown }
    if (typeof source.raw === 'string') {
      return source.raw
    }
    if (typeof source.value === 'string') {
      return source.value
    }
    if (typeof source.title === 'string') {
      return source.title
    }
  }

  return ''
}

function getSourceColumnOptionTitle(item: unknown): string {
  const value = getSourceColumnOptionValue(item)
  return value || String(item ?? '')
}

function sourceColumnUsageLabels(sourceColumn: string): string[] {
  if (!sourceColumn) {
    return []
  }

  return Object.entries(fieldMappings)
    .filter(([, mappedSourceColumn]) => mappedSourceColumn === sourceColumn)
    .map(([targetField]) => fieldLabel(targetField))
}

function sourceColumnUsageSummary(sourceColumn: string): string {
  const usageLabels = sourceColumnUsageLabels(sourceColumn)
  if (usageLabels.length <= 1) {
    return t('system.used')
  }

  return `${t('system.used')} ${usageLabels.length}x`
}

function sourceValuesForField(field: EntityTemplate): string[] {
  const sourceColumn = fieldMappings[field.name]
  if (!sourceColumn) {
    return []
  }

  const rows = [
    ...(batch.value?.rows.map((row) => row.rawData) ?? []),
    ...(batch.value?.sampleRows ?? []),
  ]
  const values = rows
    .map((row) => normalizeValueMappingKey(row[sourceColumn]))
    .filter((value) => value.length > 0)

  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function referenceOptionsForField(field: EntityTemplate): ValueOption[] {
  if (!field.referenceName) {
    return []
  }

  const referenceTemplates = genericStore.getState(field.referenceName).entityTemplates
  return (referenceValueItems[field.referenceName] ?? []).map((item) => ({
    title: getEntityValueLabel(item, referenceTemplates) || String(item.handle ?? ''),
    value: item.handle,
  }))
}

function customFieldOptionsForField(
  field: EntityTemplate,
): Array<{ label: string; value: string }> {
  return field.customField?.options ?? []
}

async function loadReferenceValueItems(referenceName: string): Promise<void> {
  if (referenceValueItems[referenceName]) {
    return
  }

  try {
    valueMappingDialog.isLoadingReferenceItems = true
    await genericStore.loadGeneric(referenceName, 'global', 'import')
    const response = await ApiGenericService.find<SaplingGenericItem>(referenceName, {
      limit: DEFAULT_ENTITY_ITEMS_COUNT,
      orderBy: { handle: 'ASC' },
      relations: ['m:1'],
    })
    referenceValueItems[referenceName] = response.data
  } finally {
    valueMappingDialog.isLoadingReferenceItems = false
  }
}

function normalizeValueMappingKey(value: unknown): string {
  return String(value ?? '').trim()
}

function hasFieldDefaultValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== null && typeof value !== 'undefined' && value !== ''
}

function normalizeValueMappingFallback(
  fallback: ImportValueMappingFallback | undefined,
): ImportValueMappingFallback {
  return fallback === 'empty' || fallback === 'error' ? fallback : 'keep'
}

function filterExistingColumns(columns: string[]): string[] {
  return normalizeSelectedColumns(columns.filter((column) => headerOptions.value.includes(column)))
}

function normalizeSelectedColumns(columns: string[]): string[] {
  return Array.from(new Set(columns.map((column) => column.trim()).filter(Boolean)))
}

function noop(): void {
  // read-only preview table
}

function collectErrorReportRawHeaders(rows: ImportBatchRowSummary[]): string[] {
  return Array.from(
    rows.reduce<Set<string>>((headers, row) => {
      Object.keys(row.rawData).forEach((header) => headers.add(header))
      return headers
    }, new Set<string>()),
  )
}

function escapeImportCsvCell(value: unknown): string {
  const text = String(value ?? '')

  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function createErrorReportFilename(filename: string): string {
  const baseName = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${baseName || 'import'}-fehlerprotokoll.csv`
}

function fieldLabel(fieldName: string): string {
  const template = selectedEntityTemplates.value.find((field) => field.name === fieldName)
  if (template?.formConfig?.label) {
    return template.formConfig.label
  }

  if (!selectedEntityHandle.value) {
    return humanizeHandle(fieldName)
  }

  const key = `${selectedEntityHandle.value}.${fieldName}`
  return te(key) ? t(key) : humanizeHandle(fieldName)
}

function entityLabel(entityHandle: string): string {
  const key = `navigation.${entityHandle}`
  return te(key) ? t(key) : humanizeHandle(entityHandle)
}

function importStatusLabel(status: string): string {
  const key = `import.status.${status}`
  return te(key) ? t(key) : humanizeHandle(status)
}

function importActionLabel(action: string): string {
  const key = `import.action.${action}`
  return te(key) ? t(key) : humanizeHandle(action)
}

function importMessageLabel(message: string | null | undefined): string {
  if (!message) {
    return '-'
  }

  if (message.startsWith(IMPORT_REQUIRED_FIELDS_MISSING_PREFIX)) {
    const fieldNames = message
      .slice(IMPORT_REQUIRED_FIELDS_MISSING_PREFIX.length)
      .split(',')
      .map((fieldName) => fieldName.trim())
      .filter(Boolean)
    const fields = fieldNames.map(fieldLabel).join(', ')

    return fields ? t('import.requiredFieldsMissing', { fields }) : t('import.requiredFieldMissing')
  }

  return te(message) ? t(message) : message
}

function aiSuggestionReason(targetField: string): string {
  const details = aiSuggestionFieldDetails[targetField]
  if (!details?.reason) {
    return t('import.aiSuggestion')
  }

  return details.reason
}

function confidencePercent(confidence: number): string {
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`
}

function humanizeHandle(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase())
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}
</script>
