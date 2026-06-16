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
            :loading="isExecuting || isExecutionRunning"
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
        <SaplingImportSetupPanel
          v-model:selected-file="selectedFile"
          v-model:selected-open-batch="selectedOpenBatchRecord"
          v-model:selected-entity="selectedTargetEntityRecord"
          v-model:selected-source="selectedSourceRecord"
          v-model:selected-template="selectedTemplateRecord"
          v-model:template-title="templateTitle"
          v-model:external-key-columns="externalKeyColumns"
          v-model:generic-reference-entity-handle="genericReferenceEntityHandle"
          v-model:generic-reference-key-columns="genericReferenceKeyColumns"
          :entity-options="entityOptions"
          :selected-entity-handle="selectedEntityHandle"
          :selected-source-handle="selectedSourceHandle"
          :selected-entity-placeholder="selectedEntityPlaceholder"
          :selected-source-placeholder="selectedSourcePlaceholder"
          :open-batch-filter="openBatchFilter"
          :entity-filter="entityFilter"
          :source-filter="sourceFilter"
          :selected-template-placeholder="selectedTemplatePlaceholder"
          :template-filter="templateFilter"
          :header-options="headerOptions"
          :has-batch="Boolean(batch)"
          :has-generic-reference="hasGenericReference"
          :can-select-templates="canSelectTemplates"
          :can-use-templates="canUseTemplates"
          :is-analyzing="isAnalyzing"
          :is-import-job-running="isImportJobRunning"
          :is-loading-open-batches="isLoadingOpenBatches"
          @analyze-selected-file="analyzeSelectedFile"
          @normalize-external-key-columns="normalizeExternalKeyColumns"
          @normalize-generic-reference-key-columns="normalizeGenericReferenceKeyColumns"
        />

        <SaplingImportMappingEditor
          :has-batch="Boolean(batch)"
          :fields="importableFields"
          :field-mappings="fieldMappings"
          :field-defaults="fieldDefaults"
          :relation-mapping-modes="relationMappingModes"
          :relation-mapping-columns="relationMappingColumns"
          :relation-mapping-mode-options="relationMappingModeOptions"
          :unique-conflict-strategies="uniqueConflictStrategies"
          :unique-conflict-strategy-options="uniqueConflictStrategyOptions"
          :header-options="headerOptions"
          :selected-entity-handle="selectedEntityHandle"
          :permissions="currentPermissions"
          :ai-suggestion-field-details="aiSuggestionFieldDetails"
          :is-import-job-running="isImportJobRunning"
          :field-label="fieldLabel"
          :ai-suggestion-reason="aiSuggestionReason"
          :confidence-percent="confidencePercent"
          :reference-items-for-field="referenceItemsForField"
          :has-value-mapping="hasValueMapping"
          :get-source-column-option-value="getSourceColumnOptionValue"
          :get-source-column-option-title="getSourceColumnOptionTitle"
          :source-column-usage-labels="sourceColumnUsageLabels"
          :source-column-usage-summary="sourceColumnUsageSummary"
          @field-mapping-change="onFieldMappingChange"
          @open-value-mapping="openValueMapping"
          @normalize-relation-mapping-columns="normalizeRelationMappingColumns"
          @update-field-mapping="updateFieldMapping"
          @update-field-default="updateFieldDefault"
          @update-relation-mapping-mode="updateRelationMappingMode"
          @update-relation-mapping-columns="updateRelationMappingColumns"
          @update-unique-conflict-strategy="updateUniqueConflictStrategy"
        />

        <SaplingImportActionBar
          v-if="batch"
          :can-suggest-with-ai="canSuggestWithAi"
          :is-suggesting="isSuggesting"
          :has-selected-template="Boolean(selectedTemplate)"
          :can-save-template="canSaveTemplate"
          :is-saving-template="isSavingTemplate"
          :can-configure="canConfigure"
          :is-configuring="isConfiguring"
          @suggest="createAiSuggestion"
          @apply-template="applySelectedTemplate"
          @save-template="saveTemplate"
          @configure="configureBatch"
        />

        <SaplingImportJobStatus
          :is-running="isImportJobRunning"
          :status-label="currentImportStatusLabel"
          :progress-label="importProgressLabel"
          :progress-percent="importProgressPercent"
        />

        <SaplingImportAiSuggestionPanel :ai-suggestion="aiSuggestion" :field-label="fieldLabel" />
      </SaplingSurface>

      <SaplingImportPreviewPanel
        :batch="batch"
        :is-preview-limited="isPreviewLimited"
        :preview-row-limit="IMPORT_PREVIEW_ROW_LIMIT"
        :sapling-preview-items="saplingPreviewItems"
        :entity-preview-title="entityPreviewTitle"
        :selected-entity-handle="selectedEntityHandle"
        :selected-entity="selectedEntity"
        :selected-entity-permission="selectedEntityPermission"
        :selected-entity-templates="selectedEntityTemplates"
        :preview-rows="previewRows"
        :sample-headers="sampleHeaders"
        :import-status-label="importStatusLabel"
        :import-action-label="importActionLabel"
        :import-message-label="importMessageLabel"
      />
    </section>

    <SaplingImportValueMappingDialog
      v-model:visible="valueMappingDialog.visible"
      :value-mapping="currentValueMapping"
      :field="currentValueMappingField"
      :source-values="currentValueMappingSourceValues"
      :selected-entity-handle="selectedEntityHandle"
      :visible-templates="importableFields"
      :permissions="currentPermissions"
      :reference-items="currentValueMappingReferenceItems"
      :field-label="fieldLabel"
      @clear="clearCurrentValueMapping"
      @close="closeValueMapping"
      @update-fallback="updateCurrentValueMappingFallback"
      @update-mapped-value="updateCurrentValueMappingValue"
    />
  </v-container>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingImportActionBar from '@/components/import/SaplingImportActionBar.vue'
import SaplingImportAiSuggestionPanel from '@/components/import/SaplingImportAiSuggestionPanel.vue'
import SaplingImportJobStatus from '@/components/import/SaplingImportJobStatus.vue'
import SaplingImportMappingEditor from '@/components/import/SaplingImportMappingEditor.vue'
import SaplingImportPreviewPanel from '@/components/import/SaplingImportPreviewPanel.vue'
import SaplingImportSetupPanel from '@/components/import/SaplingImportSetupPanel.vue'
import SaplingImportValueMappingDialog from '@/components/import/SaplingImportValueMappingDialog.vue'
import { useGenericStore } from '@/stores/genericStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
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
  type ImportUniqueConflictStrategy,
  type ImportUniqueConflictStrategyMode,
  type ImportValueMapping,
  type ImportValueMappingFallback,
  type SaveImportTemplatePayload,
} from '@/services/api.import.service'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import {
  isRunningImportStatus,
  useSaplingImportBatchPolling,
} from '@/composables/import/useSaplingImportBatchPolling'
import { useSaplingImportJobs } from '@/composables/import/useSaplingImportJobs'
import {
  buildImportErrorReportCsv,
  createImportErrorReportFilename,
} from '@/composables/import/saplingImportErrorReport'
import type { FilterQuery } from '@/services/api.generic.service'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { downloadTextFile } from '@/composables/table/saplingTableAction.utils'

type Option = { title: string; value: string }
type ErrorReportRow = ImportBatchRowSummary & { rawData: Record<string, unknown> }
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
      uniqueConflictStrategies?: ImportUniqueConflictStrategy[]
    }
  | null
  | undefined

const { t, te } = useI18n()
const genericStore = useGenericStore()
const currentPermissionStore = useCurrentPermissionStore()
const { pushMessage } = useSaplingMessageCenter()
const { trackImportBatch } = useSaplingImportJobs()
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
const IMPORT_REQUIRED_FIELDS_MISSING_PREFIX = 'import.requiredFieldsMissing:'
const IMPORT_INVALID_DATE_VALUES_PREFIX = 'import.invalidDateValues:'
const IMPORT_INVALID_BOOLEAN_VALUES_PREFIX = 'import.invalidBooleanValues:'
const IMPORT_VALUE_MAPPING_MISSING_PREFIX = 'import.valueMappingMissing:'
const IMPORT_UNIQUE_FIELD_CONFLICT_PREFIX = 'import.uniqueFieldConflict:'
const IMPORT_UNIQUE_FIELD_DUPLICATE_IN_BATCH_PREFIX = 'import.uniqueFieldDuplicateInBatch:'
const IMPORT_VALUE_MAPPING_SOURCE_VALUE_LIMIT = 100
const OPEN_IMPORT_BATCH_STATUSES = [
  'analyzed',
  'validationQueued',
  'validating',
  'validationFailed',
  'validated',
  'validatedWithErrors',
  'executionQueued',
  'executing',
  'executionFailed',
]
const selectedFile = ref<File | File[] | null>(null)
const selectedEntityHandle = ref<string | null>(null)
const selectedSourceHandle = ref<string | null>(null)
const selectedTemplateHandle = ref<number | string | null>(null)
const selectedOpenBatchRecord = ref<SaplingGenericItem | null>(null)
const selectedTargetEntityRecord = ref<SaplingGenericItem | null>(null)
const selectedSourceRecord = ref<SaplingGenericItem | null>(null)
const selectedTemplateRecord = ref<SaplingGenericItem | null>(null)
const selectedTemplateSummary = ref<ImportTemplateSummary | null>(null)
const templateTitle = ref('')
const externalKeyColumns = ref<string[]>([])
const genericReferenceEntityHandle = ref<string | null>(null)
const genericReferenceKeyColumns = ref<string[]>([])
let selectedTemplateLoadRequestId = 0
const batch = ref<ImportBatchSummary | null>(null)
const entities = ref<EntityItem[]>([])
const isAnalyzing = ref(false)
const isConfiguring = ref(false)
const isExecuting = ref(false)
const isSavingTemplate = ref(false)
const isSuggesting = ref(false)
const isLoadingOpenBatches = ref(false)
const isHydratingBatch = ref(false)
const isDownloadingErrorReport = ref(false)
const isApplyingTemplate = ref(false)
const aiSuggestion = ref<ImportAiSuggestion | null>(null)
const fieldMappings = reactive<Record<string, string | null>>({})
const fieldDefaults = reactive<Record<string, unknown>>({})
const relationMappingModes = reactive<Record<string, ImportRelationMappingMode | null>>({})
const relationMappingColumns = reactive<Record<string, string[]>>({})
const uniqueConflictStrategies = reactive<Record<string, ImportUniqueConflictStrategyMode>>({})
const valueMappings = reactive<Record<string, ValueMappingState>>({})
const sourceValueOptions = reactive<Record<string, string[]>>({})
const referenceValueItems = reactive<
  Record<string, Record<string, SaplingGenericItem | null | undefined>>
>({})
const aiSuggestionFieldDetails = reactive<
  Record<string, { confidence: number; reason: string | null }>
>({})
const valueMappingDialog = reactive<{
  visible: boolean
  targetField: string | null
}>({
  visible: false,
  targetField: null,
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

const currentPermissions = computed(() => currentPermissionStore.accumulatedPermission ?? [])

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

const selectedEntityPlaceholder = computed(() => selectedEntityHandle.value)
const selectedSourcePlaceholder = computed(() => selectedSourceHandle.value)
const openBatchFilter = computed<FilterQuery>(() => ({
  status: { $in: OPEN_IMPORT_BATCH_STATUSES },
  executedAt: null,
}))
const entityFilter = computed<FilterQuery>(() => ({
  canRead: { $ne: false },
}))
const sourceFilter = computed<FilterQuery>(() => ({
  isActive: true,
}))
const selectedTemplate = computed(() => selectedTemplateSummary.value)
const selectedTemplatePlaceholder = computed(() =>
  selectedTemplateHandle.value == null || selectedTemplateHandle.value === ''
    ? null
    : String(selectedTemplateHandle.value),
)
const templateFilter = computed<FilterQuery>(() => {
  const filter: FilterQuery = { isActive: true }

  if (selectedEntityHandle.value) {
    filter.targetEntity = { handle: selectedEntityHandle.value }
  }

  if (selectedSourceHandle.value) {
    filter.source = { handle: selectedSourceHandle.value }
  }

  return filter
})

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
const currentValueMappingSourceValues = computed(() => {
  if (!currentValueMappingField.value) {
    return []
  }

  return mergeSourceValues(
    sourceValuesForField(currentValueMappingField.value),
    Object.keys(currentValueMapping.value?.values ?? {}),
  )
})
const currentValueMappingReferenceItems = computed<
  Record<string, SaplingGenericItem | null | undefined>
>(() => {
  if (!currentValueMappingField.value) {
    return {}
  }

  return referenceItemsForField(currentValueMappingField.value) ?? {}
})
const relationMappingModeOptions = computed<
  Array<{ title: string; value: ImportRelationMappingMode }>
>(() => [
  { title: t('import.relationMappingMode.handle'), value: 'handle' },
  { title: t('import.relationMappingMode.value'), value: 'value' },
  { title: t('import.relationMappingMode.externalKey'), value: 'externalKey' },
])
const uniqueConflictStrategyOptions = computed<
  Array<{ title: string; value: ImportUniqueConflictStrategyMode }>
>(() => [
  { title: t('import.uniqueConflictStrategy.error'), value: 'error' },
  {
    title: t('import.uniqueConflictStrategy.appendExternalKey'),
    value: 'appendExternalKey',
  },
])
const canConfigure = computed(
  () =>
    Boolean(batch.value?.handle && selectedEntityHandle.value) &&
    !isConfiguring.value &&
    !isImportJobRunning.value,
)
const canSelectTemplates = computed(() => Boolean(batch.value?.handle))
const canUseTemplates = computed(() =>
  Boolean(batch.value?.handle && selectedEntityHandle.value && selectedSourceHandle.value),
)
const canSaveTemplate = computed(
  () =>
    canUseTemplates.value &&
    templateTitle.value.trim().length > 0 &&
    (Object.values(fieldMappings).some(Boolean) ||
      Object.values(fieldDefaults).some(hasFieldDefaultValue) ||
      Object.values(relationMappingModes).some(Boolean) ||
      Object.values(uniqueConflictStrategies).some((strategy) => strategy !== 'error')) &&
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
const isImportJobRunning = computed(() =>
  batch.value ? isRunningImportStatus(batch.value.status) : false,
)
const isExecutionRunning = computed(() =>
  batch.value ? ['executionQueued', 'executing'].includes(batch.value.status) : false,
)
const importProgressPercent = computed(() => {
  const totalRows = batch.value?.rowCount ?? 0
  if (totalRows <= 0) {
    return 0
  }

  return Math.min(100, Math.round(((batch.value?.processedCount ?? 0) / totalRows) * 100))
})
const currentImportStatusLabel = computed(() =>
  batch.value?.status ? importStatusLabel(batch.value.status) : '-',
)
const importProgressLabel = computed(() =>
  t('import.jobProgress', {
    processed: batch.value?.processedCount ?? 0,
    total: batch.value?.rowCount ?? 0,
  }),
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
    !isExecuting.value &&
    !isImportJobRunning.value,
)

const { startBatchPolling, stopBatchPolling } = useSaplingImportBatchPolling({
  onBatch: (refreshedBatch) => {
    batch.value = refreshedBatch
  },
  onNotFound: (handle) => {
    clearMissingBatch(handle)
  },
})

onMounted(async () => {
  await Promise.all([
    loadTranslations(),
    loadEntities(),
    currentPermissionStore.fetchCurrentPermission(),
  ])
})

onUnmounted(() => {
  stopBatchPolling()
})

watch(selectedOpenBatchRecord, (selectedBatch) => {
  if (!selectedBatch) {
    return
  }

  void loadSelectedOpenBatch(selectedBatch.handle)
})

watch(selectedTargetEntityRecord, (selectedEntityRecord) => {
  if (isHydratingBatch.value || isApplyingTemplate.value) {
    return
  }

  selectedEntityHandle.value = normalizeSelectedHandle(selectedEntityRecord?.handle)
})

watch(selectedSourceRecord, (selectedSource) => {
  if (isHydratingBatch.value || isApplyingTemplate.value) {
    return
  }

  selectedSourceHandle.value = normalizeSelectedHandle(selectedSource?.handle)
})

watch(selectedEntityHandle, async (entityHandle) => {
  if (isHydratingBatch.value || isApplyingTemplate.value) {
    return
  }

  clearSelectedTemplate()
  if (!entityHandle) {
    initializeMappings()
    return
  }
  await genericStore.loadGeneric(entityHandle, 'global', 'import')
  initializeMappings()
})

watch(selectedSourceHandle, async () => {
  if (isHydratingBatch.value || isApplyingTemplate.value) {
    return
  }

  clearSelectedTemplate()
})

watch(selectedTemplateRecord, (template) => {
  if (isHydratingBatch.value || isApplyingTemplate.value) {
    return
  }

  if (!template) {
    clearSelectedTemplate()
    return
  }

  void selectTemplateRecord(template)
})

async function loadEntities(): Promise<void> {
  const response = await ApiGenericService.find<EntityItem>('entity', {
    limit: DEFAULT_ENTITY_ITEMS_COUNT,
    orderBy: { handle: 'ASC' },
  })
  entities.value = response.data
}

async function analyzeSelectedFile(value: File | File[] | null): Promise<void> {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) {
    return
  }

  try {
    isAnalyzing.value = true
    selectedOpenBatchRecord.value = null
    clearSelectedTemplate()
    batch.value = await ApiImportService.analyzeCsv(file)
    initializeMappings()
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
    selectedTargetEntityRecord.value = selectedEntityHandle.value
      ? { handle: selectedEntityHandle.value }
      : null
    selectedSourceRecord.value = selectedSourceHandle.value
      ? { handle: selectedSourceHandle.value }
      : null
    selectedTemplateHandle.value = loadedBatch.templateHandle ?? null
    selectedTemplateSummary.value = await loadSelectedTemplateSummary()
    selectedTemplateRecord.value = selectedTemplateSummary.value
      ? importTemplateSummaryToGenericItem(selectedTemplateSummary.value)
      : null
    templateTitle.value = ''

    if (selectedEntityHandle.value) {
      await Promise.all([
        genericStore.loadGeneric(selectedEntityHandle.value, 'global', 'import'),
        loadTranslations(),
      ])
    }

    templateTitle.value = selectedTemplate.value?.title ?? ''
    initializeMappings()
    applyMappingConfiguration(
      mergeMappingConfiguration(selectedTemplate.value?.mapping, loadedBatch.mapping),
    )
    externalKeyColumns.value = filterExistingColumns(loadedBatch.externalKeyColumns ?? [])

    const genericReferenceMapping = normalizeGenericReferenceMapping(
      loadedBatch.genericReferenceMapping,
    )
    genericReferenceEntityHandle.value = genericReferenceMapping?.entityHandle ?? null
    genericReferenceKeyColumns.value = filterExistingColumns(
      genericReferenceMapping?.keyColumns ?? [],
    )
    if (isRunningImportStatus(loadedBatch.status)) {
      startBatchPolling(loadedBatch.handle)
      trackImportBatch(loadedBatch.handle)
    }
  } finally {
    isHydratingBatch.value = false
  }
}

function clearMissingBatch(handle: number): void {
  if (batch.value?.handle !== handle) {
    return
  }

  batch.value = null
  selectedFile.value = null
  selectedOpenBatchRecord.value = null
  selectedTargetEntityRecord.value = null
  selectedSourceRecord.value = null
  selectedEntityHandle.value = null
  selectedSourceHandle.value = null
  externalKeyColumns.value = []
  genericReferenceEntityHandle.value = null
  genericReferenceKeyColumns.value = []
  clearSelectedTemplate()
  clearMappingState()
}

function initializeMappings(): void {
  clearMappingState()

  for (const field of importableFields.value) {
    const matchedHeader = headerOptions.value.find(
      (header) => normalizeName(header) === normalizeName(field.name),
    )
    fieldMappings[field.name] = matchedHeader ?? null
    fieldDefaults[field.name] = getTemplateDefaultValue(field)
    if (isUniqueConflictField(field)) {
      uniqueConflictStrategies[field.name] = 'error'
    }
    if (field.isReference && field.referenceName) {
      relationMappingModes[field.name] = null
      relationMappingColumns[field.name] = []
    }
  }
}

function clearMappingState(): void {
  resetAiSuggestion()
  Object.keys(fieldMappings).forEach((key) => delete fieldMappings[key])
  Object.keys(fieldDefaults).forEach((key) => delete fieldDefaults[key])
  Object.keys(relationMappingModes).forEach((key) => delete relationMappingModes[key])
  Object.keys(relationMappingColumns).forEach((key) => delete relationMappingColumns[key])
  Object.keys(uniqueConflictStrategies).forEach((key) => delete uniqueConflictStrategies[key])
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])
  Object.keys(sourceValueOptions).forEach((key) => delete sourceValueOptions[key])
}

function applySelectedTemplate(): void {
  const template = selectedTemplate.value
  if (!template) {
    return
  }

  void applyTemplateSelection(template)
  pushMessage('success', t('import.templateLoaded'), template.title, 'import')
}

function clearSelectedTemplate(): void {
  selectedTemplateLoadRequestId += 1
  selectedTemplateHandle.value = null
  selectedTemplateRecord.value = null
  selectedTemplateSummary.value = null
}

async function selectTemplateRecord(record: SaplingGenericItem): Promise<void> {
  const handle = extractTemplateHandleNumber(record.handle)
  if (!handle) {
    clearSelectedTemplate()
    return
  }

  const requestId = ++selectedTemplateLoadRequestId
  const template = await ApiImportService.getTemplate(handle)
  if (requestId !== selectedTemplateLoadRequestId) {
    return
  }

  if (!template) {
    clearSelectedTemplate()
    return
  }

  selectedTemplateHandle.value = template.handle
  selectedTemplateSummary.value = template
  await applyTemplateSelection(template)
}

async function loadSelectedTemplateSummary(): Promise<ImportTemplateSummary | null> {
  const handle = getSelectedTemplateHandleNumber()
  return handle ? await ApiImportService.getTemplate(handle) : null
}

function importTemplateSummaryToGenericItem(template: ImportTemplateSummary): SaplingGenericItem {
  return {
    ...template,
    source: { handle: template.sourceHandle },
    targetEntity: { handle: template.entityHandle },
  }
}

async function applyTemplateSelection(template: ImportTemplateSummary): Promise<void> {
  isApplyingTemplate.value = true

  try {
    const entityChanged = selectedEntityHandle.value !== template.entityHandle
    const sourceChanged = selectedSourceHandle.value !== template.sourceHandle

    selectedEntityHandle.value = template.entityHandle
    selectedSourceHandle.value = template.sourceHandle
    selectedTargetEntityRecord.value = selectedEntityHandle.value
      ? { handle: selectedEntityHandle.value }
      : null
    selectedSourceRecord.value = selectedSourceHandle.value
      ? { handle: selectedSourceHandle.value }
      : null

    if (entityChanged && selectedEntityHandle.value) {
      await Promise.all([
        genericStore.loadGeneric(selectedEntityHandle.value, 'global', 'import'),
        loadTranslations(),
      ])
      initializeMappings()
    }

    if (entityChanged || sourceChanged) {
      selectedTemplateRecord.value = importTemplateSummaryToGenericItem(template)
    }

    selectedTemplateHandle.value = template.handle
    selectedTemplateSummary.value = template
    applyTemplate(template)
  } finally {
    isApplyingTemplate.value = false
  }
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
    trackImportBatch(batch.value.handle)
    startBatchPolling(batch.value.handle)
    pushMessage('info', t('import.validationStarted'), batch.value.filename, 'import')
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
    selectedTemplateHandle.value = savedTemplate.handle
    selectedTemplateSummary.value = savedTemplate
    selectedTemplateRecord.value = importTemplateSummaryToGenericItem(savedTemplate)
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
    const executedBatch = await ApiImportService.executeBatch(batch.value.handle)
    batch.value = executedBatch
    trackImportBatch(executedBatch.handle)
    startBatchPolling(executedBatch.handle)
    pushMessage('info', t('import.executionStarted'), executedBatch.filename, 'import')
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
      buildImportErrorReportCsv(rows, {
        importStatusLabel,
        importActionLabel,
        importMessageLabel,
      }),
      createImportErrorReportFilename(batch.value.filename),
      'text/csv;charset=utf-8',
    )
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isDownloadingErrorReport.value = false
  }
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

function updateFieldMapping(targetField: string, value: string | null): void {
  fieldMappings[targetField] = value
}

function updateFieldDefault(targetField: string, value: unknown): void {
  fieldDefaults[targetField] = value
}

function updateRelationMappingMode(
  targetField: string,
  value: ImportRelationMappingMode | null,
): void {
  relationMappingModes[targetField] = value
}

function updateRelationMappingColumns(targetField: string, value: string[]): void {
  relationMappingColumns[targetField] = value
}

function updateUniqueConflictStrategy(
  targetField: string,
  value: ImportUniqueConflictStrategyMode,
): void {
  uniqueConflictStrategies[targetField] = value
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
    uniqueConflictStrategies: buildUniqueConflictStrategies(),
    genericReferenceMapping: buildGenericReferenceMapping(),
    title: templateTitle.value.trim(),
  }
}

function getSelectedTemplateHandleNumber(): number | null {
  if (selectedTemplateHandle.value === null || selectedTemplateHandle.value === '') {
    return null
  }

  return extractTemplateHandleNumber(selectedTemplateHandle.value)
}

function extractTemplateHandleNumber(value: unknown): number | null {
  if (value === null || value === '') {
    return null
  }

  const handle = Number(value)
  return Number.isFinite(handle) ? Math.trunc(handle) : null
}

function normalizeSelectedHandle(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const normalizedValue = String(value).trim()
  return normalizedValue.length > 0 ? normalizedValue : null
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

function buildUniqueConflictStrategies(): ImportUniqueConflictStrategy[] {
  return Object.entries(uniqueConflictStrategies)
    .filter(([, strategy]) => strategy !== 'error')
    .map(([targetField, strategy]) => ({ targetField, strategy }))
}

function isUniqueConflictField(field: EntityTemplate): boolean {
  return Boolean(
    field.isUnique &&
    !field.isPrimaryKey &&
    !field.isReference &&
    ['string', 'text', 'varchar'].includes(field.type),
  )
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
  Object.keys(uniqueConflictStrategies).forEach((key) => delete uniqueConflictStrategies[key])
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])

  for (const field of importableFields.value) {
    fieldMappings[field.name] = null
    fieldDefaults[field.name] = getTemplateDefaultValue(field)
    if (isUniqueConflictField(field)) {
      uniqueConflictStrategies[field.name] = 'error'
    }
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

  for (const strategy of mappingConfiguration?.uniqueConflictStrategies ?? []) {
    if (
      !strategy.targetField ||
      !(strategy.targetField in uniqueConflictStrategies) ||
      !['error', 'appendExternalKey'].includes(strategy.strategy)
    ) {
      continue
    }

    uniqueConflictStrategies[strategy.targetField] = strategy.strategy
  }

  applyValueMappings(mappingConfiguration)
}

function mergeMappingConfiguration(
  baseConfiguration: ImportMappingConfiguration,
  overrideConfiguration: ImportMappingConfiguration,
): ImportMappingConfiguration {
  if (!baseConfiguration) {
    return overrideConfiguration
  }
  if (!overrideConfiguration) {
    return baseConfiguration
  }

  return {
    ...baseConfiguration,
    ...overrideConfiguration,
    valueMappings: mergeValueMappings(
      baseConfiguration.valueMappings ?? [],
      overrideConfiguration.valueMappings ?? [],
    ),
  }
}

function mergeValueMappings(
  baseMappings: ImportValueMapping[],
  overrideMappings: ImportValueMapping[],
): ImportValueMapping[] {
  const merged = new Map<string, ImportValueMapping>()

  for (const mapping of normalizeImportValueMappings(baseMappings)) {
    merged.set(mapping.targetField, {
      targetField: mapping.targetField,
      values: { ...mapping.values },
      fallback: mapping.fallback,
    })
  }

  for (const mapping of normalizeImportValueMappings(overrideMappings)) {
    const existing = merged.get(mapping.targetField)
    merged.set(mapping.targetField, {
      targetField: mapping.targetField,
      values: {
        ...(existing?.values ?? {}),
        ...mapping.values,
      },
      fallback: mapping.fallback ?? existing?.fallback,
    })
  }

  return [...merged.values()]
}

function normalizeImportValueMappings(mappings: ImportValueMapping[]): ImportValueMapping[] {
  return mappings
    .map((mapping) => ({
      targetField: normalizeValueMappingKey(mapping.targetField),
      values: Object.fromEntries(
        Object.entries(mapping.values ?? {})
          .map(([sourceValue, targetValue]) => [normalizeValueMappingKey(sourceValue), targetValue])
          .filter(([sourceValue, targetValue]) =>
            Boolean(
              typeof sourceValue === 'string' &&
              sourceValue.length > 0 &&
              targetValue !== null &&
              targetValue !== '',
            ),
          ),
      ),
      fallback: normalizeValueMappingFallback(mapping.fallback),
    }))
    .filter((mapping) => mapping.targetField && Object.keys(mapping.values).length > 0)
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
  delete sourceValueOptions[targetField]
  const field = importableFields.value.find((entry) => entry.name === targetField)
  const mapping = valueMappings[targetField]
  if (!field || !mapping) {
    return
  }

  void pruneValueMappingForField(field, mapping)
}

async function pruneValueMappingForField(
  field: EntityTemplate,
  mapping: ValueMappingState,
): Promise<void> {
  const sourceColumn = fieldMappings[field.name]
  if (!sourceColumn) {
    delete valueMappings[field.name]
    return
  }

  try {
    await loadSourceValuesForField(field)
  } catch {
    return
  }

  if (fieldMappings[field.name] !== sourceColumn) {
    return
  }

  const validSourceValues = new Set(sourceValuesForField(field))
  mapping.values = Object.fromEntries(
    Object.entries(mapping.values).filter(([sourceValue]) => validSourceValues.has(sourceValue)),
  )

  if (Object.keys(mapping.values).length === 0) {
    delete valueMappings[field.name]
  }
}

async function openValueMapping(field: EntityTemplate): Promise<void> {
  if (!field.name || !fieldMappings[field.name]) {
    return
  }

  ensureValueMapping(field.name)
  await loadSourceValuesForField(field)
  await loadReferenceItemsForValueMapping(field)
  valueMappingDialog.targetField = field.name
  valueMappingDialog.visible = true
}

async function loadReferenceItemsForValueMapping(field: EntityTemplate): Promise<void> {
  if (!field.isReference || !field.referenceName) {
    return
  }

  const mapping = valueMappings[field.name]
  const handles = Object.values(mapping?.values ?? {})
    .map(normalizeValueMappingKey)
    .filter((value) => value.length > 0)
  const uniqueHandles = Array.from(new Set(handles))
  if (uniqueHandles.length === 0) {
    return
  }

  const cache = getReferenceValueItemCache(field.referenceName)
  const missingHandles = uniqueHandles.filter((handle) => !(handle in cache))
  if (missingHandles.length === 0) {
    return
  }

  try {
    const response = await ApiGenericService.find<SaplingGenericItem>(field.referenceName, {
      filter: { handle: { $in: missingHandles } },
      limit: missingHandles.length,
      relations: ['m:1'],
    })
    const itemsByHandle = new Map(
      (response.data ?? [])
        .map((item) => [normalizeValueMappingKey(item.handle), item] as const)
        .filter(([handle]) => handle.length > 0),
    )

    for (const handle of missingHandles) {
      cache[handle] = itemsByHandle.get(handle) ?? null
    }
  } catch {
    for (const handle of missingHandles) {
      cache[handle] = null
    }
  }
}

function referenceItemsForField(
  field: EntityTemplate | null | undefined,
): Record<string, SaplingGenericItem | null | undefined> | undefined {
  if (!field?.isReference || !field.referenceName) {
    return undefined
  }

  return getReferenceValueItemCache(field.referenceName)
}

function getReferenceValueItemCache(
  referenceName: string,
): Record<string, SaplingGenericItem | null | undefined> {
  referenceValueItems[referenceName] ??= {}
  return referenceValueItems[referenceName]
}

async function loadSourceValuesForField(field: EntityTemplate): Promise<void> {
  const sourceColumn = fieldMappings[field.name]
  if (!batch.value?.handle || !sourceColumn) {
    sourceValueOptions[field.name] = sourceValuesForField(field)
    return
  }

  const response = await ApiImportService.getBatchSourceValues(batch.value.handle, {
    column: sourceColumn,
    limit: IMPORT_VALUE_MAPPING_SOURCE_VALUE_LIMIT,
  })
  sourceValueOptions[field.name] = response.values
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

function updateCurrentValueMappingFallback(value: ImportValueMappingFallback): void {
  const mapping = getCurrentValueMapping()
  if (mapping) {
    mapping.fallback = value
  }
}

function updateCurrentValueMappingValue(sourceValue: string, value: unknown): void {
  const mapping = getCurrentValueMapping()
  if (mapping) {
    mapping.values[sourceValue] = value
  }
}

function getCurrentValueMapping(): ValueMappingState | null {
  return valueMappingDialog.targetField ? valueMappings[valueMappingDialog.targetField] : null
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
  const cachedValues = sourceValueOptions[field.name]
  if (cachedValues) {
    return cachedValues
  }

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

function mergeSourceValues(...groups: string[][]): string[] {
  return Array.from(
    new Set(
      groups
        .flat()
        .map(normalizeValueMappingKey)
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right))
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

function getTemplateDefaultValue(field: EntityTemplate): unknown {
  if (field.name === 'handle' || field.isPrimaryKey || field.isAutoIncrement) {
    return null
  }

  const defaultValue = hasFieldDefaultValue(field.default) ? field.default : field.defaultRaw
  if (!hasFieldDefaultValue(defaultValue) || isGeneratedDefaultValue(defaultValue)) {
    return null
  }

  return normalizeTemplateDefaultValue(field, cloneTemplateDefaultValue(defaultValue))
}

function cloneTemplateDefaultValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value]
  }

  if (value && typeof value === 'object') {
    return { ...(value as Record<string, unknown>) }
  }

  return value
}

function normalizeTemplateDefaultValue(field: EntityTemplate, value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  const fieldType = String(field.type ?? '').toLowerCase()
  const trimmedValue = value.trim()

  if (fieldType.includes('boolean')) {
    if (trimmedValue.toLowerCase() === 'true') {
      return true
    }
    if (trimmedValue.toLowerCase() === 'false') {
      return false
    }
  }

  if (/(number|integer|float|double|decimal)/.test(fieldType) && trimmedValue !== '') {
    const numericValue = Number(trimmedValue)
    if (Number.isFinite(numericValue)) {
      return numericValue
    }
  }

  return trimmedValue
}

function isGeneratedDefaultValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  return /^(now\(\)|current_|gen_random_|uuid_generate_|nextval\()/i.test(value.trim())
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

  if (message.startsWith(IMPORT_INVALID_DATE_VALUES_PREFIX)) {
    const fieldNames = message
      .slice(IMPORT_INVALID_DATE_VALUES_PREFIX.length)
      .split(',')
      .map((fieldName) => fieldName.trim())
      .filter(Boolean)
    const fields = fieldNames.map(fieldLabel).join(', ')

    return fields ? t('import.invalidDateValues', { fields }) : t('import.invalidDateValue')
  }

  if (message.startsWith(IMPORT_INVALID_BOOLEAN_VALUES_PREFIX)) {
    const fieldNames = message
      .slice(IMPORT_INVALID_BOOLEAN_VALUES_PREFIX.length)
      .split(',')
      .map((fieldName) => fieldName.trim())
      .filter(Boolean)
    const fields = fieldNames.map(fieldLabel).join(', ')

    return fields ? t('import.invalidBooleanValues', { fields }) : t('global.validationError')
  }

  if (message.startsWith(IMPORT_VALUE_MAPPING_MISSING_PREFIX)) {
    const [fieldName = '', sourceValue = ''] = message
      .slice(IMPORT_VALUE_MAPPING_MISSING_PREFIX.length)
      .split(':')
      .map(decodeImportMessagePart)
    const field = fieldName ? fieldLabel(fieldName) : t('import.valueMapping')

    return sourceValue
      ? t('import.valueMappingMissingWithDetails', { field, value: sourceValue })
      : t('import.valueMappingMissing')
  }

  if (
    message.startsWith(IMPORT_UNIQUE_FIELD_CONFLICT_PREFIX) ||
    message.startsWith(IMPORT_UNIQUE_FIELD_DUPLICATE_IN_BATCH_PREFIX)
  ) {
    const isBatchDuplicate = message.startsWith(IMPORT_UNIQUE_FIELD_DUPLICATE_IN_BATCH_PREFIX)
    const prefix = isBatchDuplicate
      ? IMPORT_UNIQUE_FIELD_DUPLICATE_IN_BATCH_PREFIX
      : IMPORT_UNIQUE_FIELD_CONFLICT_PREFIX
    const [fieldName = '', value = ''] = message
      .slice(prefix.length)
      .split(':')
      .map(decodeImportMessagePart)
    const field = fieldName ? fieldLabel(fieldName) : t('import.uniqueField')

    return isBatchDuplicate
      ? t('import.uniqueFieldDuplicateInBatchWithDetails', { field, value })
      : t('import.uniqueFieldConflictWithDetails', { field, value })
  }

  return te(message) ? t(message) : message
}

function decodeImportMessagePart(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
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
