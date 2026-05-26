<template>
  <div class="sapling-overlay-shell sapling-vectorization-shell">
    <div
      v-if="isOpen && hasSaplingVectorizationAccess"
      class="sapling-overlay-backdrop sapling-vectorization__backdrop"
      @click="closePanel"
    ></div>

    <transition name="sapling-floating-panel">
      <SaplingSurface
        as="section"
        v-if="isOpen && hasSaplingVectorizationAccess"
        class="sapling-floating-panel sapling-floating-panel--bottom-right sapling-floating-panel--mobile-sheet sapling-vectorization"
        @click.stop
      >
        <template v-if="isTranslationLoading">
          <div class="d-flex flex-column ga-4 pa-4 fill-height">
            <div class="d-flex align-center justify-space-between ga-4">
              <v-skeleton-loader type="heading, text" class="flex-grow-1" />
              <v-skeleton-loader type="button" width="72" />
            </div>

            <v-skeleton-loader type="article, article, article" class="flex-grow-1" />
          </div>
        </template>

        <template v-else>
          <header
            class="sapling-section-header sapling-floating-panel__header sapling-floating-panel__header--bordered sapling-vectorization__header"
          >
            <div class="sapling-floating-panel__heading">
              <div
                class="sapling-eyebrow sapling-floating-panel__eyebrow sapling-vectorization__eyebrow"
              >
                {{ t('aiVectorization.titleEyebrow') }}
              </div>
              <div
                class="sapling-section-title sapling-floating-panel__title sapling-vectorization__title"
              >
                {{ t('aiVectorization.title') }}
              </div>
              <p class="sapling-section-subtitle sapling-vectorization__subtitle">
                {{ t('aiVectorization.subtitle') }}
              </p>
            </div>

            <div
              class="sapling-toolbar-group sapling-floating-panel__actions sapling-vectorization__header-actions"
            >
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-refresh"
                :loading="isBusy"
                @click="reloadConfiguration"
              >
                {{ t('aiVectorization.refresh') }}
              </v-btn>
              <v-btn icon="mdi-close" variant="text" size="small" @click="closePanel" />
            </div>
          </header>

          <div class="sapling-stack-lg sapling-floating-panel__body sapling-vectorization__body">
            <div
              class="sapling-responsive-grid sapling-responsive-grid--md sapling-vectorization__selectors"
            >
              <v-select
                :items="providerOptions"
                :label="t('aiVectorization.provider')"
                :model-value="selectedProviderHandle"
                item-title="label"
                item-value="value"
                variant="outlined"
                hide-details
                :loading="isLoadingProviders"
                :disabled="isBusy"
                @update:model-value="updateSelectedProvider"
              />
              <v-select
                :items="modelOptions"
                :label="t('aiVectorization.model')"
                :model-value="selectedModelHandle"
                item-title="label"
                item-value="value"
                variant="outlined"
                hide-details
                :loading="isLoadingModels"
                :disabled="isBusy || !selectedProviderHandle"
                @update:model-value="updateSelectedModel"
              />
              <v-select
                :items="entityOptions"
                :label="t('aiVectorization.entity')"
                :model-value="selectedEntityHandle"
                item-title="label"
                item-value="value"
                variant="outlined"
                hide-details
                :disabled="isBusy"
                @update:model-value="updateSelectedEntity"
              />
            </div>

            <div class="sapling-stack-md sapling-vectorization__cards">
              <section
                class="sapling-section-panel sapling-section-panel--compact sapling-floating-panel__card sapling-vectorization__card"
              >
                <div class="sapling-label sapling-vectorization__card-title">
                  {{ t('aiVectorization.indexedFieldsTitle') }}
                </div>
                <div class="sapling-chip-row sapling-vectorization__chip-grid">
                  <v-chip
                    v-for="field in indexedFieldLabels"
                    :key="field"
                    size="small"
                    variant="tonal"
                  >
                    {{ field }}
                  </v-chip>
                </div>
              </section>

              <section
                class="sapling-section-panel sapling-section-panel--compact sapling-floating-panel__card sapling-vectorization__card"
              >
                <div class="sapling-label sapling-vectorization__card-title">
                  {{ t('aiVectorization.strategyTitle') }}
                </div>
                <div class="sapling-stack-md sapling-vectorization__strategy-list">
                  <div>{{ t('aiVectorization.strategySectionAware') }}</div>
                  <div>{{ t('aiVectorization.strategyHash') }}</div>
                  <div>{{ t('aiVectorization.strategyReplacement') }}</div>
                </div>
              </section>

              <section
                v-if="lastResult"
                class="sapling-section-panel sapling-section-panel--compact sapling-floating-panel__card sapling-vectorization__card"
              >
                <div class="sapling-label sapling-vectorization__card-title">
                  {{ t('aiVectorization.lastRunTitle') }}
                </div>
                <div class="sapling-responsive-grid sapling-vectorization__stats">
                  <div
                    class="sapling-soft-panel sapling-floating-panel__stat sapling-vectorization__stat"
                  >
                    <span>{{ t('aiVectorization.totalSourceRecords') }}</span>
                    <strong>{{ lastResult.totalSourceRecords }}</strong>
                  </div>
                  <div
                    class="sapling-soft-panel sapling-floating-panel__stat sapling-vectorization__stat"
                  >
                    <span>{{ t('aiVectorization.totalDocuments') }}</span>
                    <strong>{{ lastResult.totalDocuments }}</strong>
                  </div>
                  <div
                    class="sapling-soft-panel sapling-floating-panel__stat sapling-vectorization__stat"
                  >
                    <span>{{ t('aiVectorization.embeddedDocuments') }}</span>
                    <strong>{{ lastResult.embeddedDocuments }}</strong>
                  </div>
                  <div
                    class="sapling-soft-panel sapling-floating-panel__stat sapling-vectorization__stat"
                  >
                    <span>{{ t('aiVectorization.skippedDocuments') }}</span>
                    <strong>{{ lastResult.skippedDocuments }}</strong>
                  </div>
                  <div
                    class="sapling-soft-panel sapling-floating-panel__stat sapling-vectorization__stat"
                  >
                    <span>{{ t('aiVectorization.deletedDocuments') }}</span>
                    <strong>{{ lastResult.deletedDocuments }}</strong>
                  </div>
                </div>
              </section>
            </div>

            <v-alert
              v-if="selectedProviderHandle && modelOptions.length === 0 && !isLoadingModels"
              type="warning"
              variant="tonal"
              density="comfortable"
            >
              {{ t('aiVectorization.noModels') }}
            </v-alert>
          </div>

          <footer
            class="sapling-row-md sapling-floating-panel__footer sapling-vectorization__footer"
          >
            <v-spacer />
            <v-btn variant="text" @click="closePanel">
              {{ t('aiVectorization.close') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!canRun"
              :loading="isSubmitting"
              @click="runVectorization"
            >
              {{ t('aiVectorization.run') }}
            </v-btn>
          </footer>
        </template>
      </SaplingSurface>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AiProviderModelItem, AiProviderTypeItem } from '@/entity/entity'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { useSaplingVectorization } from '@/composables/system/useSaplingVectorization'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import ApiAiService, { type VectorizeEntityResponse } from '@/services/api.ai.service'

interface SelectOption {
  label: string
  value: string
}

const { t } = useI18n()
const messageCenter = useSaplingMessageCenter()
const { isLoading: isTranslationLoading, loadTranslations } = useTranslationLoader(
  'ai',
  'aiVectorization',
  'global',
  'ticket',
  'event',
  'salesOpportunity',
  'effortEstimate',
  'effortEstimatePosition',
)
const {
  isOpen,
  hasSaplingVectorizationAccess,
  ensureSaplingVectorizationAccess,
  closeSaplingVectorization,
} = useSaplingVectorization()

const selectedEntityHandle = ref('ticket')
const providerConfigs = ref<AiProviderTypeItem[]>([])
const modelConfigs = ref<AiProviderModelItem[]>([])
const selectedProviderHandle = ref<string | null>(null)
const selectedModelHandle = ref<string | null>(null)
const isLoadingProviders = ref(false)
const isLoadingModels = ref(false)
const isSubmitting = ref(false)
const lastResult = ref<VectorizeEntityResponse | null>(null)
const hasInitialized = ref(false)
let initializationPromise: Promise<void> | null = null

const isBusy = computed(
  () => isLoadingProviders.value || isLoadingModels.value || isSubmitting.value,
)

const providerOptions = computed<SelectOption[]>(() =>
  providerConfigs.value.map((provider) => ({
    label: provider.title,
    value: provider.handle ?? '',
  })),
)

const modelOptions = computed<SelectOption[]>(() =>
  modelConfigs.value.map((model) => ({
    label: `${model.title} (${model.providerModel})`,
    value: model.handle ?? '',
  })),
)

const entityOptions = computed<SelectOption[]>(() => [
  {
    label: t('aiVectorization.entityTicket'),
    value: 'ticket',
  },
  {
    label: t('aiVectorization.entityEvent'),
    value: 'event',
  },
  {
    label: t('aiVectorization.entitySalesOpportunity'),
    value: 'salesOpportunity',
  },
  {
    label: t('aiVectorization.entityEffortEstimate'),
    value: 'effortEstimate',
  },
  {
    label: t('aiVectorization.entityEffortEstimatePosition'),
    value: 'effortEstimatePosition',
  },
])

const indexedFieldLabels = computed(() => {
  const fieldKeysByEntity: Record<string, string[]> = {
    ticket: [
      'ticket.number',
      'ticket.externalNumber',
      'ticket.title',
      'ticket.problemDescription',
      'ticket.solutionDescription',
      'ticket.status',
      'ticket.priority',
    ],
    event: ['event.title', 'event.description', 'event.status', 'event.type'],
    salesOpportunity: [
      'salesOpportunity.title',
      'salesOpportunity.description',
      'salesOpportunity.painPoints',
      'salesOpportunity.nextStep',
    ],
    effortEstimate: [
      'effortEstimate.title',
      'effortEstimate.requirementsMarkdown',
      'effortEstimate.expectedCompletionDate',
      'effortEstimate.status',
    ],
    effortEstimatePosition: [
      'effortEstimatePosition.title',
      'effortEstimatePosition.offerTextMarkdown',
      'effortEstimatePosition.estimatedHours',
    ],
  }

  return (fieldKeysByEntity[selectedEntityHandle.value] ?? fieldKeysByEntity.ticket).map((key) =>
    t(key),
  )
})

const canRun = computed(
  () =>
    !isSubmitting.value &&
    !!selectedProviderHandle.value &&
    !!selectedModelHandle.value &&
    modelOptions.value.length > 0,
)

watch(
  () => isOpen.value,
  async (nextIsOpen) => {
    if (!nextIsOpen) {
      return
    }

    if (!(await ensureSaplingVectorizationAccess())) {
      closePanel()
      return
    }

    try {
      await ensureInitialized()
    } catch {
      // Errors are handled by the API service and message center.
    }
  },
)

watch(hasSaplingVectorizationAccess, (hasAccess) => {
  if (!hasAccess && isOpen.value) {
    closePanel()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

function closePanel() {
  closeSaplingVectorization()
}

async function ensureInitialized() {
  if (hasInitialized.value) {
    return
  }

  if (initializationPromise) {
    await initializationPromise
    return
  }

  initializationPromise = (async () => {
    await loadTranslations()
    await loadProviders()
    hasInitialized.value = true
  })()

  try {
    await initializationPromise
  } finally {
    initializationPromise = null
  }
}

async function reloadConfiguration() {
  await Promise.all([loadTranslations(), loadProviders()])
}

async function loadProviders() {
  isLoadingProviders.value = true

  try {
    providerConfigs.value = await ApiAiService.listVectorizationProviders()
    selectedProviderHandle.value = pickDefaultProviderHandle()
    await loadModels(selectedProviderHandle.value)
  } finally {
    isLoadingProviders.value = false
  }
}

async function loadModels(providerHandle?: string | null) {
  isLoadingModels.value = true

  try {
    modelConfigs.value = await ApiAiService.listVectorizationModels(providerHandle ?? undefined)
    selectedModelHandle.value = pickDefaultModelHandle()
  } finally {
    isLoadingModels.value = false
  }
}

async function updateSelectedProvider(value: unknown) {
  selectedProviderHandle.value = normalizeHandle(value)
  selectedModelHandle.value = null
  await loadModels(selectedProviderHandle.value)
}

function updateSelectedModel(value: unknown) {
  selectedModelHandle.value = normalizeHandle(value)
}

function updateSelectedEntity(value: unknown) {
  selectedEntityHandle.value = normalizeHandle(value) ?? 'ticket'
  lastResult.value = null
}

function pickDefaultProviderHandle() {
  const currentHandle = selectedProviderHandle.value

  if (
    currentHandle &&
    providerConfigs.value.some((provider) => provider.handle === currentHandle)
  ) {
    return currentHandle
  }

  return providerConfigs.value[0]?.handle ?? null
}

function pickDefaultModelHandle() {
  if (modelConfigs.value.length === 0) {
    return null
  }

  const currentHandle = selectedModelHandle.value
  const preferredModel =
    modelConfigs.value.find((model) => model.handle === currentHandle) ??
    modelConfigs.value.find((model) => model.isDefault) ??
    modelConfigs.value[0]

  return preferredModel?.handle ?? null
}

async function runVectorization() {
  if (!canRun.value || !selectedProviderHandle.value || !selectedModelHandle.value) {
    return
  }

  isSubmitting.value = true

  try {
    lastResult.value = await ApiAiService.vectorizeEntity({
      entityHandle: selectedEntityHandle.value,
      providerHandle: selectedProviderHandle.value,
      modelHandle: selectedModelHandle.value,
    })
    messageCenter.pushMessage('success', 'aiVectorization.completed', '', 'aiVectorization')
  } finally {
    isSubmitting.value = false
  }
}

function normalizeHandle(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}
</script>
