<template>
  <div class="sapling-vectorization-shell">
    <div
      v-if="isOpen && hasSaplingVectorizationAccess"
      class="sapling-vectorization__backdrop"
      @click="closePanel"
    ></div>

    <transition name="sapling-vectorization-panel">
      <section
        v-if="isOpen && hasSaplingVectorizationAccess"
        class="glass-panel sapling-vectorization"
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
          <header class="sapling-vectorization__header">
            <div>
              <div class="sapling-vectorization__eyebrow">
                {{ t('aiVectorization.titleEyebrow') }}
              </div>
              <div class="sapling-vectorization__title">{{ t('aiVectorization.title') }}</div>
              <p class="sapling-vectorization__subtitle">
                {{ t('aiVectorization.subtitle') }}
              </p>
            </div>

            <div class="sapling-vectorization__header-actions">
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

          <div class="sapling-vectorization__body">
            <div class="sapling-vectorization__selectors">
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
                disabled
              />
            </div>

            <div class="sapling-vectorization__cards">
              <section class="sapling-vectorization__card">
                <div class="sapling-vectorization__card-title">
                  {{ t('aiVectorization.indexedFieldsTitle') }}
                </div>
                <div class="sapling-vectorization__chip-grid">
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

              <section class="sapling-vectorization__card">
                <div class="sapling-vectorization__card-title">
                  {{ t('aiVectorization.strategyTitle') }}
                </div>
                <div class="sapling-vectorization__strategy-list">
                  <div>{{ t('aiVectorization.strategySectionAware') }}</div>
                  <div>{{ t('aiVectorization.strategyHash') }}</div>
                  <div>{{ t('aiVectorization.strategyReplacement') }}</div>
                </div>
              </section>

              <section v-if="lastResult" class="sapling-vectorization__card">
                <div class="sapling-vectorization__card-title">
                  {{ t('aiVectorization.lastRunTitle') }}
                </div>
                <div class="sapling-vectorization__stats">
                  <div class="sapling-vectorization__stat">
                    <span>{{ t('aiVectorization.totalSourceRecords') }}</span>
                    <strong>{{ lastResult.totalSourceRecords }}</strong>
                  </div>
                  <div class="sapling-vectorization__stat">
                    <span>{{ t('aiVectorization.totalDocuments') }}</span>
                    <strong>{{ lastResult.totalDocuments }}</strong>
                  </div>
                  <div class="sapling-vectorization__stat">
                    <span>{{ t('aiVectorization.embeddedDocuments') }}</span>
                    <strong>{{ lastResult.embeddedDocuments }}</strong>
                  </div>
                  <div class="sapling-vectorization__stat">
                    <span>{{ t('aiVectorization.skippedDocuments') }}</span>
                    <strong>{{ lastResult.skippedDocuments }}</strong>
                  </div>
                  <div class="sapling-vectorization__stat">
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

          <footer class="sapling-vectorization__footer">
            <v-chip size="small" variant="tonal" prepend-icon="mdi-lock-outline">
              {{ t('aiVectorization.entityLocked') }}
            </v-chip>

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
      </section>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AiProviderModelItem, AiProviderTypeItem } from '@/entity/entity'
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
])

const indexedFieldLabels = computed(() => [
  t('ticket.number'),
  t('ticket.externalNumber'),
  t('ticket.title'),
  t('ticket.problemDescription'),
  t('ticket.solutionDescription'),
  t('ticket.status'),
  t('ticket.priority'),
])

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
