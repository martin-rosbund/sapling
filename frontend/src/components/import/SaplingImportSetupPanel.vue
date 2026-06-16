<template>
  <div class="sapling-import__toolbar">
    <v-file-input
      v-model="selectedFileModel"
      accept=".csv,.txt,.tsv,text/csv,text/plain"
      prepend-icon=""
      prepend-inner-icon="mdi-file-delimited-outline"
      density="comfortable"
      :label="t('import.selectFile')"
      :disabled="isAnalyzing || isImportJobRunning"
      :loading="isAnalyzing"
      @update:model-value="emit('analyzeSelectedFile', $event)"
    />
    <v-autocomplete
      v-model="selectedOpenBatchHandleModel"
      :items="openBatchOptions"
      item-title="title"
      item-value="value"
      prepend-inner-icon="mdi-tray-arrow-down"
      density="comfortable"
      clearable
      :label="t('import.openBatch')"
      :disabled="isAnalyzing || isLoadingOpenBatches"
      :loading="isLoadingOpenBatches"
      autocomplete="off"
      @update:model-value="emit('loadSelectedOpenBatch', $event)"
    />
    <v-autocomplete
      v-model="selectedEntityHandleModel"
      :items="entityOptions"
      item-title="title"
      item-value="value"
      prepend-inner-icon="mdi-table"
      density="comfortable"
      :label="t('import.targetEntity')"
      :disabled="!hasBatch || isImportJobRunning"
      autocomplete="off"
      @update:model-value="emit('entityChange')"
    />
    <v-autocomplete
      v-model="selectedSourceHandleModel"
      :items="sourceOptions"
      item-title="title"
      item-value="value"
      prepend-inner-icon="mdi-database"
      density="comfortable"
      clearable
      :label="t('import.source')"
      :disabled="!hasBatch || isImportJobRunning"
      autocomplete="off"
    />
    <v-autocomplete
      v-model="selectedTemplateHandleModel"
      :items="templateOptions"
      item-title="title"
      item-value="value"
      prepend-inner-icon="mdi-table-cog"
      density="comfortable"
      clearable
      :label="t('import.template')"
      :disabled="!canSelectTemplates || isImportJobRunning"
      :loading="isLoadingTemplates"
      autocomplete="off"
    />
  </div>

  <div v-if="hasBatch" class="sapling-import__settings">
    <v-text-field
      v-model="templateTitleModel"
      density="comfortable"
      prepend-inner-icon="mdi-label-outline"
      :label="t('import.templateTitle')"
      :disabled="!canUseTemplates || isImportJobRunning"
      autocomplete="off"
    />
    <v-select
      v-model="externalKeyColumnsModel"
      :items="headerOptions"
      chips
      multiple
      clearable
      density="comfortable"
      prepend-inner-icon="mdi-key-chain"
      :label="t('import.externalKeyColumns')"
      :disabled="!selectedSourceHandle || isImportJobRunning"
      autocomplete="off"
      counter
      @update:model-value="emit('normalizeExternalKeyColumns')"
    />
    <template v-if="hasGenericReference">
      <v-autocomplete
        v-model="genericReferenceEntityHandleModel"
        :items="entityOptions"
        item-title="title"
        item-value="value"
        density="comfortable"
        prepend-inner-icon="mdi-link-variant"
        :label="t('import.genericReferenceTarget')"
        autocomplete="off"
      />
      <v-select
        v-model="genericReferenceKeyColumnsModel"
        :items="headerOptions"
        chips
        multiple
        clearable
        density="comfortable"
        prepend-inner-icon="mdi-key"
        :label="t('import.externalKeyColumns')"
        :disabled="!genericReferenceEntityHandle || !selectedSourceHandle || isImportJobRunning"
        autocomplete="off"
        counter
        @update:model-value="emit('normalizeGenericReferenceKeyColumns')"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type Option = { title: string; value: string }
type BatchOption = { title: string; value: number }
type TemplateOption = { title: string; value: number | null }

const props = defineProps<{
  selectedFile: File | File[] | null
  selectedOpenBatchHandle: number | null
  selectedEntityHandle: string | null
  selectedSourceHandle: string | null
  selectedTemplateHandle: number | string | null
  templateTitle: string
  externalKeyColumns: string[]
  genericReferenceEntityHandle: string | null
  genericReferenceKeyColumns: string[]
  openBatchOptions: BatchOption[]
  entityOptions: Option[]
  sourceOptions: Option[]
  templateOptions: TemplateOption[]
  headerOptions: string[]
  hasBatch: boolean
  hasGenericReference: boolean
  canSelectTemplates: boolean
  canUseTemplates: boolean
  isAnalyzing: boolean
  isImportJobRunning: boolean
  isLoadingOpenBatches: boolean
  isLoadingTemplates: boolean
}>()

const emit = defineEmits<{
  (event: 'update:selectedFile', value: File | File[] | null): void
  (event: 'update:selectedOpenBatchHandle', value: number | null): void
  (event: 'update:selectedEntityHandle', value: string | null): void
  (event: 'update:selectedSourceHandle', value: string | null): void
  (event: 'update:selectedTemplateHandle', value: number | string | null): void
  (event: 'update:templateTitle', value: string): void
  (event: 'update:externalKeyColumns', value: string[]): void
  (event: 'update:genericReferenceEntityHandle', value: string | null): void
  (event: 'update:genericReferenceKeyColumns', value: string[]): void
  (event: 'analyzeSelectedFile', value: File | File[] | null): void
  (event: 'loadSelectedOpenBatch', value: number | string | null): void
  (event: 'entityChange'): void
  (event: 'normalizeExternalKeyColumns'): void
  (event: 'normalizeGenericReferenceKeyColumns'): void
}>()

const { t } = useI18n()

const selectedFileModel = computed({
  get: () => props.selectedFile,
  set: (value: File | File[] | null) => emit('update:selectedFile', value),
})

const selectedOpenBatchHandleModel = computed({
  get: () => props.selectedOpenBatchHandle,
  set: (value: number | null) => emit('update:selectedOpenBatchHandle', value),
})

const selectedEntityHandleModel = computed({
  get: () => props.selectedEntityHandle,
  set: (value: string | null) => emit('update:selectedEntityHandle', value),
})

const selectedSourceHandleModel = computed({
  get: () => props.selectedSourceHandle,
  set: (value: string | null) => emit('update:selectedSourceHandle', value),
})

const selectedTemplateHandleModel = computed({
  get: () => props.selectedTemplateHandle,
  set: (value: number | string | null) => emit('update:selectedTemplateHandle', value),
})

const templateTitleModel = computed({
  get: () => props.templateTitle,
  set: (value: string) => emit('update:templateTitle', value),
})

const externalKeyColumnsModel = computed({
  get: () => props.externalKeyColumns,
  set: (value: string[]) => emit('update:externalKeyColumns', value),
})

const genericReferenceEntityHandleModel = computed({
  get: () => props.genericReferenceEntityHandle,
  set: (value: string | null) => emit('update:genericReferenceEntityHandle', value),
})

const genericReferenceKeyColumnsModel = computed({
  get: () => props.genericReferenceKeyColumns,
  set: (value: string[]) => emit('update:genericReferenceKeyColumns', value),
})
</script>
