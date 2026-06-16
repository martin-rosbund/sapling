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
    <SaplingFieldSingleSelect
      v-model="selectedOpenBatchModel"
      class="sapling-import__open-batch-select"
      entity-handle="importBatch"
      :label="t('import.openBatch')"
      :disabled="isAnalyzing || isLoadingOpenBatches"
      :parent-filter="openBatchFilter"
      density="comfortable"
      hide-details
    />
    <SaplingFieldSingleSelect
      v-model="selectedEntityModel"
      class="sapling-import__entity-select"
      entity-handle="entity"
      :label="t('import.targetEntity')"
      :disabled="!hasBatch || isImportJobRunning"
      :parent-filter="entityFilter"
      :placeholder="selectedEntityPlaceholder ?? undefined"
      density="comfortable"
      hide-details
    />
    <SaplingFieldSingleSelect
      v-model="selectedSourceModel"
      class="sapling-import__source-select"
      entity-handle="importSource"
      :label="t('import.source')"
      :disabled="!hasBatch || isImportJobRunning"
      :parent-filter="sourceFilter"
      :placeholder="selectedSourcePlaceholder ?? undefined"
      density="comfortable"
      hide-details
    />
    <SaplingFieldSingleSelect
      v-model="selectedTemplateModel"
      class="sapling-import__template-select"
      entity-handle="importTemplate"
      :label="t('import.template')"
      :disabled="!canSelectTemplates || isImportJobRunning"
      :parent-filter="templateFilter"
      :placeholder="selectedTemplatePlaceholder ?? undefined"
      density="comfortable"
      hide-details
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
import SaplingFieldSingleSelect from '@/components/dialog/fields/SaplingFieldSingleSelect.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import type { FilterQuery } from '@/services/api.generic.service'

type Option = { title: string; value: string }

const props = defineProps<{
  selectedFile: File | File[] | null
  selectedOpenBatch: SaplingGenericItem | null
  selectedEntity: SaplingGenericItem | null
  selectedSource: SaplingGenericItem | null
  selectedEntityHandle: string | null
  selectedSourceHandle: string | null
  selectedTemplate: SaplingGenericItem | null
  selectedEntityPlaceholder: string | null
  selectedSourcePlaceholder: string | null
  selectedTemplatePlaceholder: string | null
  templateTitle: string
  externalKeyColumns: string[]
  genericReferenceEntityHandle: string | null
  genericReferenceKeyColumns: string[]
  entityOptions: Option[]
  openBatchFilter: FilterQuery
  entityFilter: FilterQuery
  sourceFilter: FilterQuery
  templateFilter: FilterQuery
  headerOptions: string[]
  hasBatch: boolean
  hasGenericReference: boolean
  canSelectTemplates: boolean
  canUseTemplates: boolean
  isAnalyzing: boolean
  isImportJobRunning: boolean
  isLoadingOpenBatches: boolean
}>()

const emit = defineEmits<{
  (event: 'update:selectedFile', value: File | File[] | null): void
  (event: 'update:selectedOpenBatch', value: SaplingGenericItem | null): void
  (event: 'update:selectedEntity', value: SaplingGenericItem | null): void
  (event: 'update:selectedSource', value: SaplingGenericItem | null): void
  (event: 'update:selectedTemplate', value: SaplingGenericItem | null): void
  (event: 'update:templateTitle', value: string): void
  (event: 'update:externalKeyColumns', value: string[]): void
  (event: 'update:genericReferenceEntityHandle', value: string | null): void
  (event: 'update:genericReferenceKeyColumns', value: string[]): void
  (event: 'analyzeSelectedFile', value: File | File[] | null): void
  (event: 'normalizeExternalKeyColumns'): void
  (event: 'normalizeGenericReferenceKeyColumns'): void
}>()

const { t } = useI18n()

const selectedFileModel = computed({
  get: () => props.selectedFile,
  set: (value: File | File[] | null) => emit('update:selectedFile', value),
})

const selectedOpenBatchModel = computed({
  get: () => props.selectedOpenBatch,
  set: (value: SaplingGenericItem | null) => emit('update:selectedOpenBatch', value),
})

const selectedEntityModel = computed({
  get: () => props.selectedEntity,
  set: (value: SaplingGenericItem | null) => emit('update:selectedEntity', value),
})

const selectedSourceModel = computed({
  get: () => props.selectedSource,
  set: (value: SaplingGenericItem | null) => emit('update:selectedSource', value),
})

const selectedTemplateModel = computed({
  get: () => props.selectedTemplate,
  set: (value: SaplingGenericItem | null) => emit('update:selectedTemplate', value),
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
