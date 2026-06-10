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
            color="primary"
            prepend-icon="mdi-play"
            :disabled="!canExecute"
            :loading="isExecuting"
            @click="executeBatch"
          >
            {{ $t('import.execute') }}
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
              <v-tooltip v-if="aiSuggestionFieldDetails[field.name]" :text="aiSuggestionReason(field.name)">
                <template #activator="{ props: tooltipProps }">
                  <v-chip
                    v-bind="tooltipProps"
                    size="x-small"
                    color="info"
                    variant="tonal"
                  >
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
              @update:model-value="onFieldMappingChange(field.name)"
            />
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
            <v-chip
              v-if="aiSuggestion.externalKey?.columns.length"
              size="small"
              variant="tonal"
            >
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
              <td>{{ row.message ?? '-' }}</td>
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
  type ImportBatchSummary,
  type ImportFieldMapping,
  type ImportGenericReferenceMapping,
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

type Option = { title: string; value: string }
type ValueOption = { title: string; value: unknown }
type ImportSource = SaplingGenericItem & { handle: string; title?: string; isActive?: boolean }
type ValueMappingState = {
  targetField: string
  values: Record<string, unknown>
  fallback: ImportValueMappingFallback
}
type ImportMappingConfiguration = {
  mappings?: ImportFieldMapping[]
  relationMappings?: unknown[]
  valueMappings?: ImportValueMapping[]
} | null | undefined

const { t, te } = useI18n()
const genericStore = useGenericStore()
const { pushMessage } = useSaplingMessageCenter()
const { loadTranslations } = useTranslationLoader(
  'global',
  'navigation',
  'import',
  'importBatch',
  'importBatchRow',
  'importSource',
  'importTemplate',
  'externalRecordLink',
)

const selectedFile = ref<File | File[] | null>(null)
const selectedEntityHandle = ref<string | null>(null)
const selectedSourceHandle = ref<string | null>(null)
const selectedTemplateHandle = ref<number | string | null>(null)
const templateTitle = ref('')
const externalKeyColumns = ref<string[]>([])
const genericReferenceEntityHandle = ref<string | null>(null)
const genericReferenceKeyColumns = ref<string[]>([])
const batch = ref<ImportBatchSummary | null>(null)
const entities = ref<EntityItem[]>([])
const sources = ref<ImportSource[]>([])
const templates = ref<ImportTemplateSummary[]>([])
const isAnalyzing = ref(false)
const isConfiguring = ref(false)
const isExecuting = ref(false)
const isLoadingTemplates = ref(false)
const isSavingTemplate = ref(false)
const isSuggesting = ref(false)
const aiSuggestion = ref<ImportAiSuggestion | null>(null)
const fieldMappings = reactive<Record<string, string | null>>({})
const valueMappings = reactive<Record<string, ValueMappingState>>({})
const aiSuggestionFieldDetails = reactive<Record<string, { confidence: number; reason: string | null }>>({})
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
const previewRows = computed(() => batch.value?.rows.slice(0, 100) ?? [])
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
    Object.values(fieldMappings).some(Boolean) &&
    !isSavingTemplate.value,
)
const canSuggestWithAi = computed(
  () => Boolean(batch.value?.handle && selectedEntityHandle.value) && !isSuggesting.value,
)
const canExecute = computed(
  () =>
    Boolean(batch.value?.handle) &&
    (batch.value?.readyCount ?? 0) > 0 &&
    (batch.value?.errorCount ?? 0) === 0 &&
    !isExecuting.value,
)

onMounted(async () => {
  await Promise.all([loadTranslations(), loadEntities(), loadSources()])
})

watch(selectedEntityHandle, async (entityHandle) => {
  if (!entityHandle) {
    templates.value = []
    return
  }
  await genericStore.loadGeneric(entityHandle, 'global', 'import')
  initializeMappings()
  await loadTemplates()
})

watch(selectedSourceHandle, async () => {
  selectedTemplateHandle.value = null
  await loadTemplates()
})

watch(selectedTemplate, (template) => {
  if (template) {
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

async function analyzeSelectedFile(value: File | File[] | null): Promise<void> {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) {
    return
  }

  try {
    isAnalyzing.value = true
    batch.value = await ApiImportService.analyzeCsv(file)
    initializeMappings()
    pushMessage('success', t('import.analysisCompleted'), file.name, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isAnalyzing.value = false
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
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])

  for (const field of importableFields.value) {
    const matchedHeader = headerOptions.value.find(
      (header) => normalizeName(header) === normalizeName(field.name),
    )
    fieldMappings[field.name] = matchedHeader ?? null
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
  Object.keys(fieldMappings).forEach((key) => delete fieldMappings[key])
  Object.keys(valueMappings).forEach((key) => delete valueMappings[key])

  for (const field of importableFields.value) {
    fieldMappings[field.name] = null
  }

  for (const mapping of template.mapping?.mappings ?? []) {
    if (!mapping.targetField || !mapping.sourceColumn) {
      continue
    }

    fieldMappings[mapping.targetField] = headerOptions.value.includes(mapping.sourceColumn)
      ? mapping.sourceColumn
      : null
  }

  applyValueMappings(template.mapping)

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
    if (!headerOptions.value.includes(mapping.sourceColumn) || !(mapping.targetField in fieldMappings)) {
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
    const savedTemplate = await ApiImportService.saveTemplate(payload)
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
    pushMessage('success', t('import.executionCompleted'), batch.value.filename, 'import')
  } catch {
    // shared API errors already surface through the message center
  } finally {
    isExecuting.value = false
  }
}

function normalizeExternalKeyColumns(): void {
  externalKeyColumns.value = normalizeSelectedColumns(externalKeyColumns.value)
}

function normalizeGenericReferenceKeyColumns(): void {
  genericReferenceKeyColumns.value = normalizeSelectedColumns(genericReferenceKeyColumns.value)
}

function buildTemplatePayload(): SaveImportTemplatePayload {
  return {
    entityHandle: selectedEntityHandle.value ?? '',
    sourceHandle: selectedSourceHandle.value,
    templateHandle: getSelectedTemplateHandleNumber(),
    keyColumns: externalKeyColumns.value,
    mappings: buildFieldMappings(),
    valueMappings: buildValueMappings(),
    genericReferenceMapping: buildGenericReferenceMapping(),
    title: templateTitle.value.trim(),
  }
}

function getSelectedTemplateHandleNumber(): number | null {
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

function fieldLabel(fieldName: string): string {
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

<style scoped>
.sapling-import__workspace {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(360px, 1.05fr);
  gap: 16px;
  align-items: start;
}

.sapling-import__panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sapling-import__toolbar,
.sapling-import__settings {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 12px;
}

.sapling-import__mapping {
  display: grid;
  gap: 8px;
}

.sapling-import__mapping-row {
  display: grid;
  grid-template-columns: minmax(160px, 0.8fr) minmax(180px, 1.2fr) auto;
  gap: 12px;
  align-items: center;
}

.sapling-import__mapping-label {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.sapling-import__mapping-label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sapling-import__actions,
.sapling-import__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sapling-import__ai-suggestion {
  border-radius: 8px;
}

.sapling-import__ai-suggestion-title {
  font-weight: 600;
}

.sapling-import__ai-suggestion-chips,
.sapling-import__ai-warnings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.sapling-import__table {
  max-width: 100%;
  overflow: auto;
}

.sapling-import__sapling-preview {
  display: flex;
  flex-direction: column;
  min-height: 260px;
  gap: 12px;
}

.sapling-import__value-mapping-dialog {
  border-radius: 8px;
}

.sapling-import__value-mapping-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 1100px) {
  .sapling-import__workspace {
    grid-template-columns: 1fr;
  }

  .sapling-import__toolbar,
  .sapling-import__settings {
    grid-template-columns: 1fr;
  }

  .sapling-import__mapping-row {
    grid-template-columns: 1fr auto;
  }

  .sapling-import__mapping-label {
    grid-column: 1 / -1;
  }
}
</style>
