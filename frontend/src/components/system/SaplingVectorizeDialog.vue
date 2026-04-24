<template>
  <v-dialog :model-value="modelValue" max-width="760" @update:model-value="onDialogToggle">
    <div class="glass-panel tilt-content sapling-vectorize-dialog">
      <SaplingDialogShell body-class="sapling-vectorize-dialog__body">
        <template #hero>
          <SaplingDialogHero
            :eyebrow="t('vectorize.eyebrow')"
            :title="isSubmitting ? t('vectorize.runningTitle') : t('vectorize.title')"
            :stats="heroStats"
            :loading="isLoadingOptions"
            :loading-stats-count="2"
          />
        </template>

        <template #body>
          <div class="sapling-vectorize-dialog__copy">
            {{ t('vectorize.description') }}
          </div>

          <v-form class="sapling-dialog-form" @submit.prevent="submitVectorize">
            <div class="sapling-vectorize-dialog__toggles">
              <v-select
                v-model="selectedEntityHandle"
                :items="entityOptions"
                item-title="label"
                item-value="value"
                :label="t('vectorize.entityLabel')"
                :disabled="true"
                :loading="isLoadingEntities"
                hide-details="auto"
              />
              <v-switch
                v-model="includeEmbeddings"
                :label="t('vectorize.includeEmbeddingsLabel')"
                color="primary"
                hide-details
              />
              <v-switch
                v-model="force"
                :label="t('vectorize.forceLabel')"
                color="primary"
                hide-details
              />
            </div>

            <div class="sapling-vectorize-dialog__grid">
              <v-select
                v-model="selectedProviderHandle"
                :items="providerOptions"
                item-title="label"
                item-value="value"
                :label="t('vectorize.providerLabel')"
                :disabled="isSubmitting || !includeEmbeddings"
                :loading="isLoadingProviders"
                clearable
                hide-details="auto"
              />
              <v-select
                v-model="selectedModelHandle"
                :items="modelOptions"
                item-title="label"
                item-value="value"
                :label="t('vectorize.modelLabel')"
                :disabled="isSubmitting || !includeEmbeddings"
                :loading="isLoadingModels"
                clearable
                hide-details="auto"
              />
              <v-text-field
                v-model="batchSize"
                :label="t('vectorize.batchSizeLabel')"
                type="number"
                min="1"
                :disabled="isSubmitting"
                hide-details="auto"
              />
              <v-text-field
                v-model="limit"
                :label="t('vectorize.limitLabel')"
                type="number"
                min="1"
                :disabled="isSubmitting"
                hide-details="auto"
              />
            </div>

            <v-alert
              v-if="resultSummary"
              type="success"
              variant="tonal"
              class="sapling-vectorize-dialog__result"
            >
              {{ resultSummary }}
            </v-alert>
            <v-alert
              v-if="errorText"
              type="error"
              variant="tonal"
              class="sapling-vectorize-dialog__result"
            >
              {{ errorText }}
            </v-alert>
          </v-form>
        </template>

        <template #actions>
          <div class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-btn variant="text" :disabled="isSubmitting" @click="closeDialog">
                {{ t('vectorize.close') }}
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :loading="isSubmitting"
                @click="submitVectorize"
              >
                {{ t('vectorize.start') }}
              </v-btn>
            </v-card-actions>
          </div>
        </template>
      </SaplingDialogShell>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiAiService, { type TicketVectorizeResponse } from '@/services/api.ai.service'
import ApiGenericService from '@/services/api.generic.service'
import type { AiProviderModelItem, AiProviderTypeItem, EntityItem } from '@/entity/entity'

const SUPPORTED_EMBEDDING_MODELS = [
  'text-embedding-3-small',
  'text-embedding-3-large',
  'gemini-embedding-001',
]

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader(
  'vectorize',
  'global',
  'navigation',
)

const isLoadingEntities = ref(false)
const isLoadingProviders = ref(false)
const isLoadingModels = ref(false)
const isSubmitting = ref(false)
const entityOptions = ref<Array<{ label: string; value: string }>>([])
const providerOptions = ref<Array<{ label: string; value: string }>>([])
const modelOptions = ref<Array<{ label: string; value: string }>>([])
const availableModels = ref<AiProviderModelItem[]>([])
const selectedEntityHandle = ref('ticket')
const selectedProviderHandle = ref<string | null>(null)
const selectedModelHandle = ref<string | null>(null)
const includeEmbeddings = ref(true)
const force = ref(false)
const batchSize = ref('100')
const limit = ref('')
const result = ref<TicketVectorizeResponse | null>(null)
const errorText = ref('')

const isLoadingOptions = computed(
  () =>
    isTranslationLoading.value ||
    isLoadingEntities.value ||
    isLoadingProviders.value ||
    isLoadingModels.value,
)

const heroStats = computed(() => {
  if (!result.value) {
    return [
      { label: t('vectorize.batchSizeLabel'), value: batchSize.value || '100' },
      {
        label: t('vectorize.embeddingsLabel'),
        value: includeEmbeddings.value ? t('global.show') : t('global.hide'),
      },
    ]
  }

  return [
    { label: t('vectorize.processedLabel'), value: result.value.processed },
    { label: t('vectorize.updatedLabel'), value: result.value.updated + result.value.created },
  ]
})

const resultSummary = computed(() => {
  if (!result.value) {
    return ''
  }

  return [
    `${t('vectorize.processedLabel')}: ${result.value.processed}`,
    `${t('vectorize.createdLabel')}: ${result.value.created}`,
    `${t('vectorize.updatedLabel')}: ${result.value.updated}`,
    `${t('vectorize.skippedLabel')}: ${result.value.skipped}`,
  ].join(', ')
})

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) {
      return
    }

    await loadEntityOptions()
    await loadProviders()
  },
)

watch(selectedProviderHandle, async (providerHandle) => {
  if (!includeEmbeddings.value) {
    return
  }

  await loadModels(providerHandle)
})

watch(includeEmbeddings, async (enabled) => {
  if (!enabled) {
    selectedProviderHandle.value = null
    selectedModelHandle.value = null
    modelOptions.value = []
    return
  }

  await loadProviders()
})

function onDialogToggle(value: boolean) {
  emit('update:modelValue', value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

async function loadEntityOptions() {
  isLoadingEntities.value = true

  try {
    const response = await ApiGenericService.find<EntityItem>('entity', {
      filter: {
        handle: 'ticket',
      },
      orderBy: {
        handle: 'ASC',
      },
      page: 1,
      limit: 10,
    })

    entityOptions.value = (response.data ?? []).map((entity) => ({
      label: t(`navigation.${entity.handle}`),
      value: entity.handle,
    }))
    selectedEntityHandle.value = entityOptions.value[0]?.value ?? 'ticket'
  } finally {
    isLoadingEntities.value = false
  }
}

async function loadProviders() {
  isLoadingProviders.value = true

  try {
    const response = await ApiGenericService.find<AiProviderTypeItem>('aiProviderType', {
      filter: {
        isActive: true,
        handle: { $in: ['openai', 'gemini'] },
      },
      orderBy: {
        title: 'ASC',
      },
      page: 1,
      limit: 50,
    })

    providerOptions.value = (response.data ?? []).map((provider) => ({
      label: provider.title,
      value: String(provider.handle ?? ''),
    }))

    if (!selectedProviderHandle.value && providerOptions.value.length > 0) {
      selectedProviderHandle.value = providerOptions.value[0]?.value ?? null
    }

    await loadModels(selectedProviderHandle.value)
  } finally {
    isLoadingProviders.value = false
  }
}

async function loadModels(providerHandle?: string | null) {
  if (!includeEmbeddings.value) {
    return
  }

  isLoadingModels.value = true

  try {
    const response = await ApiGenericService.find<AiProviderModelItem>('aiProviderModel', {
      filter: {
        isActive: true,
        providerModel: { $in: SUPPORTED_EMBEDDING_MODELS },
        ...(providerHandle ? { provider: { handle: providerHandle } } : {}),
      },
      orderBy: {
        isDefault: 'DESC',
        sortOrder: 'ASC',
        title: 'ASC',
      },
      relations: ['provider'],
      page: 1,
      limit: 50,
    })

    availableModels.value = response.data ?? []
    modelOptions.value = availableModels.value.map((model) => ({
      label: `${model.title} (${model.providerModel})`,
      value: String(model.handle ?? ''),
    }))

    if (
      !selectedModelHandle.value ||
      !modelOptions.value.some((model) => model.value === selectedModelHandle.value)
    ) {
      selectedModelHandle.value =
        (availableModels.value.find((model) => model.isDefault)?.handle ??
          modelOptions.value[0]?.value ??
          null) as string | null
    }
  } finally {
    isLoadingModels.value = false
  }
}

async function submitVectorize() {
  isSubmitting.value = true
  errorText.value = ''

  try {
    result.value = await ApiAiService.vectorizeTickets({
      entityHandle: selectedEntityHandle.value,
      providerHandle: includeEmbeddings.value ? selectedProviderHandle.value ?? undefined : undefined,
      modelHandle: includeEmbeddings.value ? selectedModelHandle.value ?? undefined : undefined,
      batchSize: parseOptionalInteger(batchSize.value),
      limit: parseOptionalInteger(limit.value),
      force: force.value,
      includeEmbeddings: includeEmbeddings.value,
    })
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : t('vectorize.runFailed')
  } finally {
    isSubmitting.value = false
  }
}

function parseOptionalInteger(value: string): number | undefined {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return undefined
  }

  const parsedValue = Number(normalizedValue)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined
}
</script>

<style scoped>
.sapling-vectorize-dialog {
  max-height: min(82vh, 860px);
  overflow: hidden;
}

.sapling-vectorize-dialog__body {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

.sapling-vectorize-dialog__copy {
  color: rgba(var(--v-theme-on-surface), 0.78);
  line-height: 1.55;
}

.sapling-vectorize-dialog__toggles {
  display: grid;
  gap: 0.25rem;
}

.sapling-vectorize-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.sapling-vectorize-dialog__result {
  margin-top: 0.5rem;
}

@media (max-width: 720px) {
  .sapling-vectorize-dialog__grid {
    grid-template-columns: 1fr;
  }
}
</style>