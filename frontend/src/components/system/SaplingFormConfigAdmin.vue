<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--uniform-inset sapling-config-page sapling-form-config"
    fluid
  >
    <SaplingPageHero
      class="sapling-config-hero sapling-form-config__hero"
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
        <div
          class="sapling-action-cluster sapling-config-hero-actions sapling-form-config__hero-actions"
        >
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
            class="sapling-upload-native-input sapling-form-config__file-input"
            type="file"
            accept="application/json,.json"
            @change="onImportFileChange"
          />
        </div>
      </template>
    </SaplingPageHero>

    <v-alert
      v-if="errorMessage"
      class="sapling-config-alert sapling-form-config__alert"
      type="error"
      variant="tonal"
      density="comfortable"
    >
      {{ errorMessage }}
    </v-alert>

    <section class="sapling-config-workspace sapling-form-config__workspace">
      <SaplingSurface
        class="sapling-panel-shell sapling-section-panel sapling-config-panel sapling-config-panel--blurred sapling-form-config__panel sapling-form-config__panel--editor"
      >
        <div class="sapling-config-toolbar sapling-form-config__toolbar">
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

        <div class="sapling-config-settings sapling-form-config__settings">
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
          <div class="sapling-form-config__scope-handle">
            <SaplingFieldSingleSelect
              v-if="scopeSelectEntityHandle"
              :key="scopeSelectKey"
              :model-value="selectedScopeItem"
              :label="$t('formConfig.scopeHandle')"
              :entity-handle="scopeSelectEntityHandle"
              :placeholder="scopeHandle"
              density="comfortable"
              hide-details
              @update:model-value="onScopeItemUpdate"
            />
            <v-text-field
              v-else
              v-model="scopeHandle"
              density="comfortable"
              hide-details
              :label="$t('formConfig.scopeHandle')"
              prepend-inner-icon="mdi-pound"
              disabled
            />
          </div>
          <div class="sapling-row-md sapling-config-switches sapling-form-config__switches">
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

        <SaplingFormConfigSummary
          :form-visible-count="formVisibleCount"
          :table-visible-count="tableVisibleCount"
          :mobile-visible-count="mobileVisibleCount"
          :hidden-field-count="hiddenFieldCount"
        />

        <SaplingFormConfigFieldList
          :fields="fieldRows"
          :width-options="widthOptions"
          :renderer-options="rendererOptions"
          :resolve-field-label="resolveFieldLabel"
          @show-all="showAllFields"
          @reset="resetCurrentConfig"
        />
      </SaplingSurface>

      <SaplingFormConfigPreviewPanel
        v-model:preview-mode="previewMode"
        :selected-entity-handle="selectedEntityHandle"
        :draft-templates="draftTemplates"
        :reload-disabled="!selectedEntityHandle"
        @reload="loadEntityContext"
      />
    </section>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import ApiFormConfigService, {
  type SaplingFormConfigItem,
} from '@/services/api.form-config.service'
import ApiGenericService from '@/services/api.generic.service'
import ApiTemplateService from '@/services/api.template.service'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import type {
  EntityTemplate,
  EntityTemplateFormWidth,
  SaplingFormConfigPayload,
  SaplingFormFieldConfig,
  SaplingFormRenderer,
} from '@/entity/structure'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingFieldSingleSelect from '@/components/dialog/fields/SaplingFieldSingleSelect.vue'
import SaplingFormConfigFieldList from '@/components/system/form-config/SaplingFormConfigFieldList.vue'
import SaplingFormConfigPreviewPanel from '@/components/system/form-config/SaplingFormConfigPreviewPanel.vue'
import SaplingFormConfigSummary from '@/components/system/form-config/SaplingFormConfigSummary.vue'
import type { FieldDraft, PreviewMode, StaticOption } from '@/components/system/form-config/formConfigAdmin.types'
import { getDialogTemplateWidth } from '@/utils/saplingDialogLayoutUtil'

type ScopeValue = 'global' | 'role' | 'person'

const FORM_CONFIG_UNSUPPORTED_RELATION_KINDS = ['1:m', 'm:n', 'n:m', '1:1']

const { t, te } = useI18n()
const route = useRoute()

const entities = ref<EntityItem[]>([])
const configs = ref<SaplingFormConfigItem[]>([])
const baseTemplates = ref<EntityTemplate[]>([])
const selectedEntityHandle = ref('')
const selectedConfigHandle = ref<number | null>(null)
const configName = ref('')
const configScope = ref<ScopeValue>('global')
const scopeHandle = ref('')
const selectedScopeItem = ref<SaplingGenericItem | null>(null)
const isActive = ref(true)
const isDefault = ref(false)
const isLoadingEntities = ref(false)
const isLoadingContext = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const fieldRows = reactive<FieldDraft[]>([])
const previewMode = ref<PreviewMode>('form')

const widthOptions: StaticOption<EntityTemplateFormWidth>[] = [
  { title: '25%', value: 1 },
  { title: '50%', value: 2 },
  { title: '75%', value: 3 },
  { title: '100%', value: 4 },
]

const rendererOptions: StaticOption<SaplingFormRenderer>[] = [
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
  { title: 'Select', value: 'select' },
  { title: 'Multi select', value: 'multiSelect' },
]

const scopeOptions = computed(() => [
  { title: t('formConfig.scopeGlobal'), value: 'global' },
  { title: t('formConfig.scopeRole'), value: 'role' },
  { title: t('formConfig.scopePerson'), value: 'person' },
])

const scopeSelectEntityHandle = computed(() => {
  if (configScope.value === 'role') {
    return 'role'
  }

  if (configScope.value === 'person') {
    return 'person'
  }

  return ''
})

const scopeSelectKey = computed(() => `${configScope.value}-${scopeHandle.value || 'empty'}`)

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
        tableVisible: field.tableVisible,
        tableOrder: field.tableOrder,
        mobileVisible: field.mobileVisible,
        mobileOrder: field.mobileOrder,
        renderer: field.renderer,
        placeholder: field.placeholder.trim() || null,
        required: field.required,
        readonly: field.readonly,
      } satisfies SaplingFormFieldConfig,
    ]),
  ),
}))

const draftTemplates = computed(() =>
  baseTemplates.value.map((template) => applyDraftToTemplate(template)),
)

const formVisibleCount = computed(() => fieldRows.filter((field) => field.visible).length)
const tableVisibleCount = computed(() => fieldRows.filter((field) => field.tableVisible).length)
const mobileVisibleCount = computed(() => fieldRows.filter((field) => field.mobileVisible).length)
const hiddenFieldCount = computed(() => fieldRows.filter((field) => !field.visible).length)

watch(
  () => route.query.entity,
  () => {
    const requestedEntity = getRequestedEntityHandle()
    if (requestedEntity && requestedEntity !== selectedEntityHandle.value) {
      selectedEntityHandle.value = requestedEntity
    }
  },
)

watch(selectedEntityHandle, () => {
  void loadEntityContext()
})

watch(selectedConfigHandle, () => {
  applySelectedConfig()
})

watch(configScope, (scope) => {
  selectedScopeItem.value = null
  if (scope === 'global') {
    scopeHandle.value = ''
  }
})

onMounted(async () => {
  await loadEntities()
})

async function loadEntities(): Promise<void> {
  isLoadingEntities.value = true
  errorMessage.value = ''

  try {
    entities.value = await fetchAllEntities()
    const requestedEntity = getRequestedEntityHandle()
    selectedEntityHandle.value =
      requestedEntity && entities.value.some((entity) => entity.handle === requestedEntity)
        ? requestedEntity
        : (entities.value[0]?.handle ?? '')
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

function getRequestedEntityHandle(): string {
  const rawEntity = route.query.entity
  const value = Array.isArray(rawEntity) ? rawEntity[0] : rawEntity
  return typeof value === 'string' ? value.trim() : ''
}

async function loadEntityContext(): Promise<void> {
  if (!selectedEntityHandle.value) {
    return
  }

  isLoadingContext.value = true
  errorMessage.value = ''

  try {
    const [templates, nextConfigs] = await Promise.all([
      ApiTemplateService.getEntityTemplate(selectedEntityHandle.value),
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
  selectedScopeItem.value = null
  isActive.value = true
  isDefault.value = configs.value.length === 0
  buildFieldRows({})
}

function applySelectedConfig(): void {
  const selectedConfig = configs.value.find(
    (config) => config.handle === selectedConfigHandle.value,
  )
  if (!selectedConfig) {
    startNewConfig()
    return
  }

  configName.value = selectedConfig.name
  configScope.value = selectedConfig.scope
  scopeHandle.value = selectedConfig.scopeHandle ?? ''
  selectedScopeItem.value = null
  isActive.value = selectedConfig.isActive
  isDefault.value = selectedConfig.isDefault
  buildFieldRows(selectedConfig.config.fields ?? {})
}

function buildFieldRows(configFields: SaplingFormConfigPayload['fields']): void {
  fieldRows.splice(0, fieldRows.length)

  baseTemplates.value
    .filter((template) => !FORM_CONFIG_UNSUPPORTED_RELATION_KINDS.includes(template.kind ?? ''))
    .forEach((template, index) => {
      const fieldConfig = getFieldConfig(configFields?.[template.name])
      const visible = fieldConfig.visible ?? template.formVisible ?? false
      fieldRows.push({
        name: template.name,
        type: template.type,
        visible,
        label: fieldConfig.label ?? getTemplateDefaultLabel(template),
        group: fieldConfig.group ?? template.formGroup ?? '',
        order: fieldConfig.order ?? template.formOrder ?? index + 1,
        width: fieldConfig.width ?? template.formWidth ?? getDialogTemplateWidth(template),
        tableVisible: fieldConfig.tableVisible ?? template.tableVisible ?? visible,
        tableOrder:
          fieldConfig.tableOrder ?? template.tableOrder ?? template.formOrder ?? index + 1,
        mobileVisible: fieldConfig.mobileVisible ?? template.mobileVisible ?? false,
        mobileOrder:
          fieldConfig.mobileOrder ??
          template.mobileOrder ??
          template.tableOrder ??
          template.formOrder ??
          index + 1,
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

function getRecordHandle(item?: SaplingGenericItem | null): string {
  const handle = item?.handle
  return typeof handle === 'string' || typeof handle === 'number' ? String(handle) : ''
}

function onScopeItemUpdate(item: SaplingGenericItem | null): void {
  selectedScopeItem.value = item
  scopeHandle.value = getRecordHandle(item)
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
    formVisible: field.visible,
    tableVisible: field.tableVisible,
    tableOrder: field.tableOrder,
    mobileVisible: field.mobileVisible,
    mobileOrder: field.mobileOrder,
    isRequired: field.required,
    formConfig: {
      visible: field.visible,
      label: field.label || null,
      group: field.group || null,
      order: field.order,
      width: field.width,
      tableVisible: field.tableVisible,
      tableOrder: field.tableOrder,
      mobileVisible: field.mobileVisible,
      mobileOrder: field.mobileOrder,
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
      scopeHandle:
        configScope.value === 'global'
          ? null
          : getRecordHandle(selectedScopeItem.value) || scopeHandle.value.trim() || null,
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

function resetCurrentConfig(): void {
  buildFieldRows({})
}

function showAllFields(): void {
  fieldRows.forEach((field) => {
    field.visible = true
    field.tableVisible = true
    field.mobileVisible = true
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
    const validation = await ApiFormConfigService.validate(selectedEntityHandle.value, parsed)
    if (!validation.isValid) {
      errorMessage.value = t('formConfig.validationSummary', {
        errors: validation.errors.length,
        warnings: validation.warnings.length,
      })
      return
    }

    buildFieldRows(validation.normalizedConfig.fields ?? parsed.fields ?? {})
  } catch {
    errorMessage.value = t('formConfig.importFailed')
  }
}

function exportDraft(): void {
  const blob = new Blob([JSON.stringify(draftConfig.value, null, 2)], {
    type: 'application/json',
  })
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

function getTemplateDefaultLabel(template: EntityTemplate): string {
  const configuredLabel = template.formConfig?.label?.trim()
  if (configuredLabel) {
    return configuredLabel
  }

  const key = `${selectedEntityHandle.value}.${template.name}`
  return te(key) ? t(key) : ''
}

</script>
