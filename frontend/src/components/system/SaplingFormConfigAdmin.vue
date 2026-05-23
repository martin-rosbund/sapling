<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--uniform-inset sapling-form-config"
    fluid
  >
    <SaplingPageHero
      class="sapling-form-config__hero"
      variant="system"
      :eyebrow="$t('formConfig.eyebrow')"
      :title="$t('formConfig.title')"
    >
      <p>{{ $t('formConfig.subtitle') }}</p>

      <template #meta>
        <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-table-cog">
          {{ selectedEntityHandle || $t('formConfig.noEntity') }}
        </v-chip>
        <v-chip size="small" variant="outlined" prepend-icon="mdi-form-select">
          {{ baseTemplates.length }}
        </v-chip>
        <v-chip size="small" variant="outlined" prepend-icon="mdi-database-cog-outline">
          {{ configs.length }}
        </v-chip>
      </template>

      <template #side>
        <div class="sapling-form-config__hero-actions">
          <v-btn
            prepend-icon="mdi-content-save"
            color="primary"
            :disabled="!canSave"
            :loading="isSaving"
            @click="saveConfig"
          >
            {{ $t('global.save') }}
          </v-btn>
          <v-btn
            prepend-icon="mdi-file-export-outline"
            variant="tonal"
            :disabled="!selectedEntityHandle"
            @click="exportDraft"
          >
            {{ $t('formConfig.export') }}
          </v-btn>
          <v-btn prepend-icon="mdi-file-import-outline" variant="text" @click="openImportFile">
            {{ $t('formConfig.import') }}
          </v-btn>
          <input
            ref="fileInputRef"
            class="sapling-form-config__file-input"
            type="file"
            accept="application/json,.json"
            @change="onImportFileChange"
          />
        </div>
      </template>
    </SaplingPageHero>

    <v-alert
      v-if="errorMessage"
      class="sapling-form-config__alert"
      type="error"
      variant="tonal"
      density="comfortable"
    >
      {{ errorMessage }}
    </v-alert>

    <section class="sapling-form-config__workspace">
      <div class="sapling-form-config__panel sapling-form-config__panel--editor glass-panel">
        <div class="sapling-form-config__toolbar">
          <v-autocomplete
            v-model="selectedEntityHandle"
            class="sapling-form-config__entity-select"
            :items="entityOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-table"
            density="comfortable"
            hide-details
            :label="$t('formConfig.entity')"
            :loading="isLoadingEntities"
          />
          <v-select
            v-model="selectedConfigHandle"
            class="sapling-form-config__config-select"
            :items="configOptions"
            item-title="title"
            item-value="value"
            prepend-inner-icon="mdi-tune-variant"
            density="comfortable"
            hide-details
            :label="$t('formConfig.configuration')"
            :disabled="!selectedEntityHandle"
          />
          <v-btn
            icon="mdi-plus"
            variant="tonal"
            :title="$t('formConfig.newConfig')"
            :disabled="!selectedEntityHandle"
            @click="startNewConfig"
          />
        </div>

        <div class="sapling-form-config__settings">
          <v-text-field
            v-model="configName"
            density="comfortable"
            :label="$t('formConfig.name')"
            prepend-inner-icon="mdi-label-outline"
          />
          <v-select
            v-model="configScope"
            density="comfortable"
            :items="scopeOptions"
            item-title="title"
            item-value="value"
            :label="$t('formConfig.scope')"
            prepend-inner-icon="mdi-account-filter-outline"
          />
          <v-text-field
            v-model="scopeHandle"
            density="comfortable"
            :label="$t('formConfig.scopeHandle')"
            prepend-inner-icon="mdi-pound"
            :disabled="configScope === 'global'"
          />
          <div class="sapling-form-config__switches">
            <v-switch
              v-model="isActive"
              color="primary"
              hide-details
              density="compact"
              :label="$t('formConfig.active')"
            />
            <v-switch
              v-model="isDefault"
              color="primary"
              hide-details
              density="compact"
              :label="$t('formConfig.defaultConfig')"
            />
          </div>
        </div>

        <div class="sapling-form-config__field-tools">
          <v-text-field
            v-model="fieldSearch"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            :label="$t('global.search')"
            hide-details
          />
          <v-btn
            prepend-icon="mdi-eye-check-outline"
            variant="text"
            :disabled="fieldRows.length === 0"
            @click="showAllFields"
          >
            {{ $t('formConfig.showAll') }}
          </v-btn>
          <v-btn
            prepend-icon="mdi-restore"
            variant="text"
            :disabled="fieldRows.length === 0"
            @click="resetCurrentConfig"
          >
            {{ $t('filter.reset') }}
          </v-btn>
        </div>

        <div class="sapling-form-config__field-list" role="list">
          <article
            v-for="field in filteredFieldRows"
            :key="field.name"
            class="sapling-form-config-field glass-panel"
            role="listitem"
          >
            <div class="sapling-form-config-field__main">
              <v-switch
                v-model="field.visible"
                color="primary"
                hide-details
                density="compact"
                :aria-label="$t('formConfig.visible')"
              />
              <div>
                <strong>{{ resolveFieldLabel(field.name) }}</strong>
                <span>{{ field.name }} - {{ field.type }}</span>
              </div>
            </div>

            <div class="sapling-form-config-field__controls">
              <v-text-field
                v-model="field.label"
                density="compact"
                hide-details
                :label="$t('formConfig.label')"
              />
              <v-text-field
                v-model="field.group"
                density="compact"
                hide-details
                :label="$t('formConfig.group')"
              />
              <v-number-input
                v-model="field.order"
                density="compact"
                hide-details
                :label="$t('formConfig.order')"
              />
              <v-select
                v-model="field.width"
                density="compact"
                hide-details
                :items="widthOptions"
                item-title="title"
                item-value="value"
                :label="$t('formConfig.width')"
              />
              <v-select
                v-model="field.renderer"
                density="compact"
                hide-details
                :items="rendererOptions"
                item-title="title"
                item-value="value"
                :label="$t('formConfig.renderer')"
              />
              <v-text-field
                v-model="field.placeholder"
                density="compact"
                hide-details
                :label="$t('formConfig.placeholder')"
              />
            </div>

            <div class="sapling-form-config-field__toggles">
              <v-checkbox
                v-model="field.required"
                density="compact"
                hide-details
                :label="$t('formConfig.required')"
              />
              <v-checkbox
                v-model="field.readonly"
                density="compact"
                hide-details
                :label="$t('formConfig.readonly')"
              />
            </div>
          </article>
        </div>
      </div>

      <aside class="sapling-form-config__panel sapling-form-config__panel--preview glass-panel">
        <div class="sapling-form-config__preview-header">
          <div>
            <p class="sapling-form-config__eyebrow">{{ $t('formConfig.livePreview') }}</p>
            <h2>{{ previewTitle }}</h2>
          </div>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            :title="$t('formConfig.reload')"
            :disabled="!selectedEntityHandle"
            @click="loadEntityContext"
          />
        </div>

        <div class="sapling-form-config-preview glass-panel" aria-live="polite">
          <section
            v-for="group in previewGroups"
            :key="group.id"
            class="sapling-form-config-preview__group"
          >
            <h3 v-if="group.label">{{ group.label }}</h3>
            <div class="sapling-form-config-preview__grid">
              <div
                v-for="field in group.templates"
                :key="field.name"
                class="sapling-form-config-preview__field glass-panel"
                :class="`sapling-form-config-preview__field--w${getPreviewWidth(field)}`"
              >
                <span>{{ getPreviewFieldLabel(field) }}</span>
                <strong>{{ getPreviewRenderer(field) }}</strong>
                <small>{{ getPreviewMeta(field) }}</small>
              </div>
            </div>
          </section>
        </div>

        <div class="sapling-form-config__json-panel">
          <div class="sapling-form-config__json-header">
            <p class="sapling-form-config__eyebrow">{{ $t('formConfig.json') }}</p>
            <v-btn
              size="small"
              prepend-icon="mdi-check-decagram-outline"
              variant="text"
              :disabled="!selectedEntityHandle"
              @click="validateDraft"
            >
              {{ $t('formConfig.validate') }}
            </v-btn>
          </div>
          <SaplingCodeMirror
            class="sapling-form-config__json-editor"
            :model-value="draftJson"
            language="json"
            :read-only="true"
            :line-numbers="false"
          />
          <v-alert
            v-if="validationSummary"
            class="sapling-form-config__validation"
            :type="validationIsValid ? 'success' : 'warning'"
            variant="tonal"
            density="compact"
          >
            {{ validationSummary }}
          </v-alert>
        </div>
      </aside>
    </section>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ApiFormConfigService, {
  type SaplingFormConfigItem,
  type SaplingFormConfigValidationResult,
} from '@/services/api.form-config.service'
import ApiGenericService from '@/services/api.generic.service'
import ApiService from '@/services/api.service'
import type { EntityItem } from '@/entity/entity'
import type {
  EntityTemplate,
  EntityTemplateFormWidth,
  SaplingFormConfigPayload,
  SaplingFormFieldConfig,
  SaplingFormRenderer,
} from '@/entity/structure'
import SaplingCodeMirror from '@/components/common/SaplingCodeMirror.vue'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import {
  getDialogTemplateWidth,
  groupDialogTemplates,
  sortDialogTemplates,
} from '@/utils/saplingDialogLayoutUtil'

type ScopeValue = 'global' | 'role' | 'person'

type FieldDraft = {
  name: string
  type: string
  visible: boolean
  label: string
  group: string
  order: number | null
  width: EntityTemplateFormWidth
  renderer: SaplingFormRenderer
  placeholder: string
  required: boolean
  readonly: boolean
}

const { t, te } = useI18n()

const entities = ref<EntityItem[]>([])
const configs = ref<SaplingFormConfigItem[]>([])
const baseTemplates = ref<EntityTemplate[]>([])
const selectedEntityHandle = ref('')
const selectedConfigHandle = ref<number | null>(null)
const configName = ref('')
const configScope = ref<ScopeValue>('global')
const scopeHandle = ref('')
const isActive = ref(true)
const isDefault = ref(false)
const fieldSearch = ref('')
const isLoadingEntities = ref(false)
const isLoadingContext = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const validationResult = ref<SaplingFormConfigValidationResult | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const fieldRows = reactive<FieldDraft[]>([])

const widthOptions = [
  { title: '25%', value: 1 },
  { title: '50%', value: 2 },
  { title: '75%', value: 3 },
  { title: '100%', value: 4 },
]

const rendererOptions: Array<{ title: string; value: SaplingFormRenderer }> = [
  { title: 'Auto', value: 'auto' },
  { title: 'Text', value: 'shortText' },
  { title: 'Long text', value: 'longText' },
  { title: 'Number', value: 'number' },
  { title: 'Boolean', value: 'boolean' },
  { title: 'Date', value: 'date' },
  { title: 'Date time', value: 'dateTime' },
  { title: 'Time', value: 'time' },
  { title: 'Markdown', value: 'markdown' },
  { title: 'JSON', value: 'json' },
  { title: 'Phone', value: 'phone' },
  { title: 'Mail', value: 'mail' },
  { title: 'Link', value: 'link' },
  { title: 'Password', value: 'password' },
  { title: 'Money', value: 'money' },
  { title: 'Percent', value: 'percent' },
  { title: 'Color', value: 'color' },
  { title: 'Icon', value: 'icon' },
]

const scopeOptions = computed(() => [
  { title: t('formConfig.scopeGlobal'), value: 'global' },
  { title: t('formConfig.scopeRole'), value: 'role' },
  { title: t('formConfig.scopePerson'), value: 'person' },
])

const entityOptions = computed(() =>
  entities.value.map((entity) => ({
    title: translateEntity(entity.handle),
    value: entity.handle,
  })),
)

const configOptions = computed(() => [
  { title: t('formConfig.newConfig'), value: null },
  ...configs.value.map((config) => ({
    title: config.name,
    value: config.handle ?? null,
  })),
])

const canSave = computed(
  () => Boolean(selectedEntityHandle.value && configName.value.trim()) && !isLoadingContext.value,
)

const filteredFieldRows = computed(() => {
  const query = fieldSearch.value.trim().toLowerCase()
  if (!query) {
    return fieldRows
  }

  return fieldRows.filter((field) =>
    [field.name, field.label, field.group, field.type].some((value) =>
      String(value ?? '').toLowerCase().includes(query),
    ),
  )
})

const draftConfig = computed<SaplingFormConfigPayload>(() => ({
  schema: 'sapling.form-config.v1',
  entityHandle: selectedEntityHandle.value,
  fields: Object.fromEntries(
    fieldRows.map((field) => [
      field.name,
      {
        visible: field.visible,
        label: field.label.trim() || null,
        group: field.group.trim() || null,
        order: field.order,
        width: field.width,
        renderer: field.renderer,
        placeholder: field.placeholder.trim() || null,
        required: field.required,
        readonly: field.readonly,
      } satisfies SaplingFormFieldConfig,
    ]),
  ),
}))

const draftJson = computed(() => JSON.stringify(draftConfig.value, null, 2))

const previewTemplates = computed(() =>
  sortDialogTemplates(
    baseTemplates.value
      .map((template) => applyDraftToTemplate(template))
      .filter((template) => template.formConfig?.visible !== false)
      .filter((template) => !template.isAutoIncrement)
      .filter((template) => !['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind ?? '')),
  ),
)

const previewGroups = computed(() =>
  groupDialogTemplates(previewTemplates.value, (groupKey) => translateGroup(groupKey)),
)

const previewTitle = computed(() =>
  selectedEntityHandle.value ? translateEntity(selectedEntityHandle.value) : t('formConfig.preview'),
)

const validationIsValid = computed(() => validationResult.value?.isValid === true)

const validationSummary = computed(() => {
  const result = validationResult.value
  if (!result) {
    return ''
  }

  return t('formConfig.validationSummary', {
    errors: result.errors.length,
    warnings: result.warnings.length,
  })
})

watch(selectedEntityHandle, () => {
  void loadEntityContext()
})

watch(selectedConfigHandle, () => {
  applySelectedConfig()
})

onMounted(async () => {
  await loadEntities()
})

async function loadEntities(): Promise<void> {
  isLoadingEntities.value = true
  errorMessage.value = ''

  try {
    entities.value = await fetchAllEntities()
    selectedEntityHandle.value = entities.value[0]?.handle ?? ''
  } catch {
    errorMessage.value = t('formConfig.loadFailed')
  } finally {
    isLoadingEntities.value = false
  }
}

async function fetchAllEntities(): Promise<EntityItem[]> {
  const limit = 200
  const result: EntityItem[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await ApiGenericService.find<EntityItem>('entity', {
      page,
      limit,
      orderBy: { order: 'ASC', handle: 'ASC' },
    })
    result.push(...response.data)
    totalPages = response.meta.totalPages || 1
    page += 1
  } while (page <= totalPages)

  return result
}

async function loadEntityContext(): Promise<void> {
  if (!selectedEntityHandle.value) {
    return
  }

  isLoadingContext.value = true
  errorMessage.value = ''
  validationResult.value = null

  try {
    const [templates, nextConfigs] = await Promise.all([
      ApiService.findAll<EntityTemplate[]>(`template/${selectedEntityHandle.value}`),
      ApiFormConfigService.list(selectedEntityHandle.value),
    ])
    baseTemplates.value = templates
    configs.value = nextConfigs
    selectedConfigHandle.value = nextConfigs[0]?.handle ?? null

    if (!selectedConfigHandle.value) {
      startNewConfig()
    } else {
      applySelectedConfig()
    }
  } catch {
    errorMessage.value = t('formConfig.loadFailed')
  } finally {
    isLoadingContext.value = false
  }
}

function startNewConfig(): void {
  selectedConfigHandle.value = null
  configName.value = selectedEntityHandle.value
    ? `${translateEntity(selectedEntityHandle.value)} ${t('formConfig.configuration')}`
    : t('formConfig.newConfig')
  configScope.value = 'global'
  scopeHandle.value = ''
  isActive.value = true
  isDefault.value = configs.value.length === 0
  buildFieldRows({})
}

function applySelectedConfig(): void {
  const selectedConfig = configs.value.find((config) => config.handle === selectedConfigHandle.value)
  if (!selectedConfig) {
    startNewConfig()
    return
  }

  configName.value = selectedConfig.name
  configScope.value = selectedConfig.scope
  scopeHandle.value = selectedConfig.scopeHandle ?? ''
  isActive.value = selectedConfig.isActive
  isDefault.value = selectedConfig.isDefault
  buildFieldRows(selectedConfig.config.fields ?? {})
}

function buildFieldRows(configFields: SaplingFormConfigPayload['fields']): void {
  fieldRows.splice(0, fieldRows.length)

  baseTemplates.value
    .filter((template) => !['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind ?? ''))
    .forEach((template, index) => {
      const fieldConfig = getFieldConfig(configFields?.[template.name])
      fieldRows.push({
        name: template.name,
        type: template.type,
        visible: fieldConfig.visible !== false,
        label: fieldConfig.label ?? '',
        group: fieldConfig.group ?? template.formGroup ?? '',
        order: fieldConfig.order ?? template.formOrder ?? index + 1,
        width: fieldConfig.width ?? template.formWidth ?? getDialogTemplateWidth(template),
        renderer: fieldConfig.renderer ?? 'auto',
        placeholder: fieldConfig.placeholder ?? '',
        required: fieldConfig.required ?? template.isRequired === true,
        readonly:
          fieldConfig.readonly ??
          (template.options?.includes('isReadOnly') === true ||
            template.options?.includes('isSecurity') === true),
      })
    })
}

function getFieldConfig(value: unknown): SaplingFormFieldConfig {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as SaplingFormFieldConfig)
    : {}
}

function applyDraftToTemplate(template: EntityTemplate): EntityTemplate {
  const field = fieldRows.find((entry) => entry.name === template.name)
  if (!field) {
    return template
  }

  return {
    ...template,
    formGroup: field.group || null,
    formOrder: field.order,
    formWidth: field.width,
    isRequired: field.required,
    formConfig: {
      visible: field.visible,
      label: field.label || null,
      group: field.group || null,
      order: field.order,
      width: field.width,
      renderer: field.renderer,
      placeholder: field.placeholder || null,
      required: field.required,
      readonly: field.readonly,
    },
  }
}

async function saveConfig(): Promise<void> {
  if (!canSave.value) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    const payload = {
      name: configName.value.trim(),
      scope: configScope.value,
      scopeHandle: configScope.value === 'global' ? null : scopeHandle.value.trim() || null,
      isActive: isActive.value,
      isDefault: isDefault.value,
      config: draftConfig.value,
    }

    const savedConfig =
      selectedConfigHandle.value == null
        ? await ApiFormConfigService.create(selectedEntityHandle.value, payload)
        : await ApiFormConfigService.update(
            selectedEntityHandle.value,
            selectedConfigHandle.value,
            payload,
          )

    await loadEntityContext()
    selectedConfigHandle.value = savedConfig.handle ?? null
  } catch {
    errorMessage.value = t('formConfig.saveFailed')
  } finally {
    isSaving.value = false
  }
}

async function validateDraft(): Promise<void> {
  if (!selectedEntityHandle.value) {
    return
  }

  try {
    validationResult.value = await ApiFormConfigService.validate(
      selectedEntityHandle.value,
      draftConfig.value,
    )
  } catch {
    errorMessage.value = t('formConfig.validationFailed')
  }
}

function resetCurrentConfig(): void {
  buildFieldRows({})
}

function showAllFields(): void {
  fieldRows.forEach((field) => {
    field.visible = true
  })
}

function openImportFile(): void {
  fileInputRef.value?.click()
}

async function onImportFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as SaplingFormConfigPayload
    if (parsed.entityHandle && parsed.entityHandle !== selectedEntityHandle.value) {
      selectedEntityHandle.value = parsed.entityHandle
      await loadEntityContext()
    }

    configName.value = file.name.replace(/\.json$/i, '')
    selectedConfigHandle.value = null
    buildFieldRows(parsed.fields ?? {})
    validationResult.value = await ApiFormConfigService.validate(
      selectedEntityHandle.value,
      parsed,
    )
  } catch {
    errorMessage.value = t('formConfig.importFailed')
  }
}

function exportDraft(): void {
  const blob = new Blob([draftJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${selectedEntityHandle.value || 'sapling'}-form-config.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function translateEntity(entityHandle: string): string {
  const key = `navigation.${entityHandle}`
  return te(key) ? t(key) : entityHandle
}

function resolveFieldLabel(fieldName: string): string {
  const configuredLabel = fieldRows.find((field) => field.name === fieldName)?.label.trim()
  if (configuredLabel) {
    return configuredLabel
  }

  const key = `${selectedEntityHandle.value}.${fieldName}`
  return te(key) ? t(key) : fieldName
}

function translateGroup(groupKey: string): string {
  return te(groupKey) ? t(groupKey) : groupKey
}

function getPreviewWidth(template: EntityTemplate): EntityTemplateFormWidth {
  return getDialogTemplateWidth(template)
}

function getPreviewFieldLabel(template: EntityTemplate): string {
  const configuredLabel = template.formConfig?.label?.trim()
  if (configuredLabel) {
    return configuredLabel
  }

  const key = `${selectedEntityHandle.value}.${template.name}`
  return te(key) ? t(key) : template.name
}

function getPreviewRenderer(template: EntityTemplate): string {
  return template.formConfig?.renderer && template.formConfig.renderer !== 'auto'
    ? template.formConfig.renderer
    : inferRenderer(template)
}

function inferRenderer(template: EntityTemplate): string {
  if (template.options?.includes('isPhone')) return 'phone'
  if (template.options?.includes('isMail')) return 'mail'
  if (template.options?.includes('isLink')) return 'link'
  if (template.options?.includes('isMoney')) return 'money'
  if (template.options?.includes('isPercent')) return 'percent'
  if (template.options?.includes('isMarkdown')) return 'markdown'
  if (template.type === 'boolean') return 'boolean'
  if (template.type === 'number') return 'number'
  if (template.type === 'datetime') return 'dateTime'
  if (template.type === 'DateType') return 'date'
  if (template.type === 'JsonType') return 'json'
  return (template.length ?? 0) > 128 ? 'longText' : 'shortText'
}

function getPreviewMeta(template: EntityTemplate): string {
  const parts = []
  if (template.isRequired) parts.push(t('formConfig.required'))
  if (template.formConfig?.readonly) parts.push(t('formConfig.readonly'))
  return parts.join(' - ') || t('formConfig.optional')
}
</script>
