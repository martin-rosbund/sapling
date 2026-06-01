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

        <div class="sapling-form-config__summary" aria-live="polite">
          <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-form-select">
            {{ formVisibleCount }} {{ $t('formConfig.formFields') }}
          </v-chip>
          <v-chip size="small" variant="outlined" prepend-icon="mdi-table">
            {{ tableVisibleCount }} {{ $t('formConfig.tableFields') }}
          </v-chip>
          <v-chip size="small" variant="outlined" prepend-icon="mdi-cellphone">
            {{ mobileVisibleCount }} {{ $t('formConfig.mobileFields') }}
          </v-chip>
          <v-chip size="small" variant="outlined" prepend-icon="mdi-eye-off-outline">
            {{ hiddenFieldCount }} {{ $t('formConfig.hiddenFields') }}
          </v-chip>
        </div>

        <div class="sapling-config-field-tools sapling-form-config__field-tools">
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

        <div
          class="sapling-scroll-list sapling-config-field-list sapling-form-config__field-list"
          role="list"
        >
          <SaplingSurface
            as="article"
            v-for="field in filteredFieldRows"
            :key="field.name"
            class="sapling-panel-shell sapling-stack-md sapling-config-field sapling-form-config-field"
            role="listitem"
          >
            <div class="sapling-row-md sapling-config-field__main sapling-form-config-field__main">
              <v-switch
                v-model="field.visible"
                color="primary"
                hide-details
                density="compact"
                :label="$t('formConfig.formVisible')"
                :aria-label="$t('formConfig.formVisible')"
              />
              <div>
                <strong>{{ resolveFieldLabel(field.name) }}</strong>
                <span>{{ field.name }} - {{ field.type }}</span>
              </div>
            </div>

            <div class="sapling-config-field__controls sapling-form-config-field__controls">
              <v-text-field
                v-model="field.label"
                class="sapling-config-field__control sapling-config-field__control--label"
                density="compact"
                hide-details
                :label="$t('formConfig.label')"
              />
              <v-text-field
                v-model="field.placeholder"
                class="sapling-config-field__control sapling-config-field__control--placeholder"
                density="compact"
                hide-details
                :label="$t('formConfig.placeholder')"
              />
              <v-text-field
                v-model="field.group"
                class="sapling-config-field__control"
                density="compact"
                hide-details
                :label="$t('formConfig.group')"
              />
              <v-number-input
                v-model="field.order"
                class="sapling-config-field__control"
                density="compact"
                hide-details
                :label="$t('formConfig.formOrder')"
              />
              <v-number-input
                v-model="field.tableOrder"
                class="sapling-config-field__control"
                density="compact"
                hide-details
                :label="$t('formConfig.tableOrder')"
              />
              <v-number-input
                v-model="field.mobileOrder"
                class="sapling-config-field__control"
                density="compact"
                hide-details
                :label="$t('formConfig.mobileOrder')"
              />
              <v-select
                v-model="field.width"
                class="sapling-config-field__control"
                density="compact"
                hide-details
                :items="widthOptions"
                item-title="title"
                item-value="value"
                :label="$t('formConfig.width')"
              />
              <v-select
                v-model="field.renderer"
                class="sapling-config-field__control"
                density="compact"
                hide-details
                :items="rendererOptions"
                item-title="title"
                item-value="value"
                :label="$t('formConfig.renderer')"
              />
            </div>

            <div
              class="sapling-row-md sapling-config-field__toggles sapling-form-config-field__toggles"
            >
              <v-checkbox
                v-model="field.required"
                density="compact"
                hide-details
                :label="$t('formConfig.required')"
              />
              <v-checkbox
                v-model="field.tableVisible"
                density="compact"
                hide-details
                :label="$t('formConfig.tableVisible')"
              />
              <v-checkbox
                v-model="field.mobileVisible"
                density="compact"
                hide-details
                :label="$t('formConfig.mobileVisible')"
              />
              <v-checkbox
                v-model="field.readonly"
                density="compact"
                hide-details
                :label="$t('formConfig.readonly')"
              />
            </div>
          </SaplingSurface>
        </div>
      </SaplingSurface>

      <SaplingSurface
        as="aside"
        class="sapling-panel-shell sapling-section-panel sapling-config-panel sapling-config-panel--blurred sapling-config-panel--sticky sapling-form-config__panel sapling-form-config__panel--preview"
      >
        <div
          class="sapling-row-between-md sapling-config-preview-header sapling-form-config__preview-header"
        >
          <div>
            <p class="sapling-eyebrow sapling-config-eyebrow sapling-form-config__eyebrow">
              {{ $t('formConfig.livePreview') }}
            </p>
            <h2 class="sapling-section-title">{{ previewTitle }}</h2>
          </div>
          <div class="sapling-form-config-preview__header-actions">
            <v-chip size="small" variant="tonal" color="primary">
              {{ activePreviewCount }}
            </v-chip>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              :title="$t('formConfig.reload')"
              :disabled="!selectedEntityHandle"
              @click="loadEntityContext"
            />
          </div>
        </div>

        <SaplingSurface
          class="sapling-panel-shell sapling-stack-lg sapling-config-preview sapling-form-config-preview"
          aria-live="polite"
        >
          <v-btn-toggle
            v-model="previewMode"
            class="sapling-form-config-preview__mode-toggle"
            mandatory
            density="compact"
            variant="tonal"
          >
            <v-btn
              v-for="option in previewModeOptions"
              :key="option.value"
              :value="option.value"
              :prepend-icon="option.icon"
            >
              {{ option.title }}
            </v-btn>
          </v-btn-toggle>

          <div v-if="previewMode === 'form'" class="sapling-form-config-preview__stage">
            <section
              v-for="group in previewGroups"
              :key="group.id"
              class="sapling-stack-md sapling-config-preview__group sapling-form-config-preview__group"
            >
              <h3 v-if="group.label">{{ group.label }}</h3>
              <div class="sapling-config-preview__grid sapling-form-config-preview__grid">
                <SaplingSurface
                  v-for="field in group.templates"
                  :key="field.name"
                  class="sapling-panel-shell sapling-config-preview__field sapling-form-config-preview__field"
                  :class="`sapling-config-preview__field--w${getPreviewWidth(field)}`"
                >
                  <span>{{ getPreviewFieldLabel(field) }}</span>
                  <strong>{{ getPreviewRenderer(field) }}</strong>
                  <small>{{ getPreviewMeta(field) }}</small>
                </SaplingSurface>
              </div>
            </section>
            <div v-if="previewGroups.length === 0" class="sapling-form-config-preview__empty">
              <v-icon icon="mdi-eye-off-outline" />
              <span>{{ $t('formConfig.noPreviewFields') }}</span>
            </div>
          </div>

          <div v-else-if="previewMode === 'table'" class="sapling-form-config-preview__stage">
            <div v-if="previewTableTemplates.length > 0" class="sapling-form-config-preview-table">
              <div class="sapling-form-config-preview-table__scroll">
                <table>
                  <thead>
                    <tr>
                      <th v-for="field in previewTableTemplates" :key="field.name">
                        {{ getPreviewFieldLabel(field) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="field in previewTableTemplates" :key="field.name">
                        <span :class="getPreviewValueClasses(field)">
                          <v-icon
                            v-if="field.options?.includes('isIcon')"
                            icon="mdi-shape-outline"
                            size="small"
                          />
                          {{ getPreviewSampleValue(field) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="sapling-form-config-preview__empty">
              <v-icon icon="mdi-table-off" />
              <span>{{ $t('formConfig.noPreviewFields') }}</span>
            </div>
          </div>

          <div v-else class="sapling-form-config-preview__stage">
            <div
              v-if="previewMobileTemplates.length > 0"
              class="sapling-form-config-preview-mobile"
            >
              <div class="sapling-form-config-preview-phone glass-panel">
                <div class="sapling-form-config-preview-phone__status">
                  <span>{{ previewTitle }}</span>
                  <v-icon icon="mdi-dots-horizontal" size="small" />
                </div>
                <div class="sapling-form-config-preview-phone__card">
                  <section
                    v-for="(field, index) in previewMobileTemplates"
                    :key="field.name"
                    class="sapling-form-config-preview-phone__field"
                    :class="{
                      'sapling-form-config-preview-phone__field--primary': index === 0,
                    }"
                  >
                    <span>{{ getPreviewFieldLabel(field) }}</span>
                    <strong>{{ getPreviewSampleValue(field) }}</strong>
                  </section>
                </div>
              </div>
            </div>
            <div v-else class="sapling-form-config-preview__empty">
              <v-icon icon="mdi-cellphone-off" />
              <span>{{ $t('formConfig.noPreviewFields') }}</span>
            </div>
          </div>
        </SaplingSurface>
      </SaplingSurface>
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
import ApiService from '@/services/api.service'
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
import {
  getDialogTemplateWidth,
  groupDialogTemplates,
  sortDialogTemplates,
} from '@/utils/saplingDialogLayoutUtil'
import { getMobileTableHeaders, sortTableHeaders } from '@/utils/saplingTableUtil'

type ScopeValue = 'global' | 'role' | 'person'
type PreviewMode = 'form' | 'table' | 'mobile'

type FieldDraft = {
  name: string
  type: string
  visible: boolean
  label: string
  group: string
  order: number | null
  width: EntityTemplateFormWidth
  tableVisible: boolean
  tableOrder: number | null
  mobileVisible: boolean
  mobileOrder: number | null
  renderer: SaplingFormRenderer
  placeholder: string
  required: boolean
  readonly: boolean
}

const PREVIEW_UNSUPPORTED_RELATION_KINDS = ['1:m', 'm:n', 'n:m']
const PREVIEW_UNSUPPORTED_FORM_RELATION_KINDS = [...PREVIEW_UNSUPPORTED_RELATION_KINDS, '1:1']

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
const fieldSearch = ref('')
const isLoadingEntities = ref(false)
const isLoadingContext = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const fieldRows = reactive<FieldDraft[]>([])
const previewMode = ref<PreviewMode>('form')

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

const previewModeOptions = computed<Array<{ title: string; value: PreviewMode; icon: string }>>(
  () => [
    { title: t('formConfig.previewForm'), value: 'form', icon: 'mdi-form-select' },
    { title: t('formConfig.previewTable'), value: 'table', icon: 'mdi-table' },
    { title: t('formConfig.previewMobileTable'), value: 'mobile', icon: 'mdi-cellphone' },
  ],
)

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

const filteredFieldRows = computed(() => {
  const query = fieldSearch.value.trim().toLowerCase()
  if (!query) {
    return fieldRows
  }

  return fieldRows.filter((field) =>
    [field.name, field.label, field.group, field.type].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(query),
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

const previewTemplates = computed(() =>
  sortDialogTemplates(
    draftTemplates.value
      .filter((template) => template.formVisible === true)
      .filter((template) => !template.isAutoIncrement)
      .filter((template) => !PREVIEW_UNSUPPORTED_FORM_RELATION_KINDS.includes(template.kind ?? '')),
  ),
)

const previewGroups = computed(() =>
  groupDialogTemplates(previewTemplates.value, (groupKey) => translateGroup(groupKey)),
)

const previewTableTemplates = computed(() =>
  sortTableHeaders(
    draftTemplates.value
      .filter(isPreviewSupportedTableTemplate)
      .filter((template) => template.tableVisible === true),
  ),
)

const previewMobileTemplates = computed(() =>
  getMobileTableHeaders(
    draftTemplates.value.filter(isPreviewSupportedTableTemplate).map((template) => ({
      ...template,
      key: template.name,
      title: getPreviewFieldLabel(template),
    })),
  ),
)

const activePreviewCount = computed(() => {
  if (previewMode.value === 'table') {
    return previewTableTemplates.value.length
  }

  if (previewMode.value === 'mobile') {
    return previewMobileTemplates.value.length
  }

  return previewTemplates.value.length
})

const formVisibleCount = computed(() => fieldRows.filter((field) => field.visible).length)
const tableVisibleCount = computed(() => fieldRows.filter((field) => field.tableVisible).length)
const mobileVisibleCount = computed(() => fieldRows.filter((field) => field.mobileVisible).length)
const hiddenFieldCount = computed(() => fieldRows.filter((field) => !field.visible).length)

const previewTitle = computed(() =>
  selectedEntityHandle.value
    ? translateEntity(selectedEntityHandle.value)
    : t('formConfig.preview'),
)

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
    .filter((template) => !PREVIEW_UNSUPPORTED_FORM_RELATION_KINDS.includes(template.kind ?? ''))
    .forEach((template, index) => {
      const fieldConfig = getFieldConfig(configFields?.[template.name])
      const visible = fieldConfig.visible ?? template.formVisible ?? false
      fieldRows.push({
        name: template.name,
        type: template.type,
        visible,
        label: fieldConfig.label ?? '',
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

function translateGroup(groupKey: string): string {
  return te(groupKey) ? t(groupKey) : groupKey
}

function isPreviewSupportedTableTemplate(template: EntityTemplate): boolean {
  return (
    !template.options?.includes('isSecurity') &&
    !PREVIEW_UNSUPPORTED_RELATION_KINDS.includes(template.kind ?? '')
  )
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

function getPreviewSampleValue(template: EntityTemplate): string {
  if (template.referenceName) {
    return translateEntity(template.referenceName)
  }

  if (template.options?.includes('isMail')) return 'kontakt@sapling.local'
  if (template.options?.includes('isPhone')) return '+49 30 123456'
  if (template.options?.includes('isLink')) return 'sapling.local'
  if (template.options?.includes('isMoney')) return '1.240,00 EUR'
  if (template.options?.includes('isPercent')) return '42 %'
  if (template.options?.includes('isColor')) return '#3F7F72'
  if (template.options?.includes('isIcon')) return 'mdi-shape-outline'
  if (template.type === 'boolean') return 'true'
  if (template.type === 'datetime') return '30.05.2026 09:30'
  if (template.type === 'DateType') return '30.05.2026'
  if (['number', 'integer', 'float', 'double', 'decimal'].includes(template.type.toLowerCase())) {
    return '42'
  }

  return getPreviewFieldLabel(template)
}

function getPreviewValueClasses(template: EntityTemplate): string[] {
  return [
    'sapling-form-config-preview-table__value',
    template.options?.includes('isChip') ? 'sapling-form-config-preview-table__value--chip' : '',
    template.options?.includes('isColor') ? 'sapling-form-config-preview-table__value--color' : '',
    template.options?.includes('isIcon') ? 'sapling-form-config-preview-table__value--icon' : '',
  ].filter(Boolean)
}

function getPreviewMeta(template: EntityTemplate): string {
  const parts = []
  if (template.isRequired) parts.push(t('formConfig.required'))
  if (template.formConfig?.readonly) parts.push(t('formConfig.readonly'))
  return parts.join(' - ') || t('formConfig.optional')
}
</script>
