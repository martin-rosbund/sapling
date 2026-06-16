<template>
  <SaplingSurface
    as="aside"
    class="sapling-panel-shell sapling-section-panel sapling-config-panel sapling-config-panel--blurred sapling-form-config__panel sapling-form-config__panel--preview"
  >
    <div
      class="sapling-row-between-md sapling-config-preview-header sapling-form-config__preview-header"
    >
      <div>
        <p class="sapling-eyebrow sapling-config-eyebrow sapling-form-config__eyebrow">
          {{ t('formConfig.livePreview') }}
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
          :title="t('formConfig.reload')"
          :disabled="reloadDisabled"
          @click="emit('reload')"
        />
      </div>
    </div>

    <SaplingSurface
      class="sapling-panel-shell sapling-stack-lg sapling-config-preview sapling-form-config-preview"
      aria-live="polite"
    >
      <v-btn-toggle
        v-model="previewModeModel"
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

      <div v-if="previewModeModel === 'form'" class="sapling-form-config-preview__stage">
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
          <span>{{ t('formConfig.noPreviewFields') }}</span>
        </div>
      </div>

      <div v-else-if="previewModeModel === 'table'" class="sapling-form-config-preview__stage">
        <div v-if="previewTableTemplates.length > 0" class="sapling-form-config-preview-table">
          <div class="sapling-form-config-preview-table__scroll" :style="previewTableScrollStyle">
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
          <span>{{ t('formConfig.noPreviewFields') }}</span>
        </div>
      </div>

      <div v-else class="sapling-form-config-preview__stage">
        <div v-if="previewMobileTemplates.length > 0" class="sapling-form-config-preview-mobile">
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
          <span>{{ t('formConfig.noPreviewFields') }}</span>
        </div>
      </div>
    </SaplingSurface>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EntityTemplate, EntityTemplateFormWidth } from '@/entity/structure'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import {
  getDialogTemplateWidth,
  groupDialogTemplates,
  sortDialogTemplates,
} from '@/utils/saplingDialogLayoutUtil'
import { getMobileTableHeaders, sortTableHeaders } from '@/utils/saplingTableUtil'

type PreviewMode = 'form' | 'table' | 'mobile'

const PREVIEW_UNSUPPORTED_RELATION_KINDS = ['1:m', 'm:n', 'n:m']
const PREVIEW_UNSUPPORTED_FORM_RELATION_KINDS = [...PREVIEW_UNSUPPORTED_RELATION_KINDS, '1:1']

const props = defineProps<{
  selectedEntityHandle: string
  draftTemplates: EntityTemplate[]
  previewMode: PreviewMode
  reloadDisabled: boolean
}>()

const emit = defineEmits<{
  (event: 'update:previewMode', value: PreviewMode): void
  (event: 'reload'): void
}>()

const { t, te } = useI18n()

const previewModeModel = computed({
  get: () => props.previewMode,
  set: (value: PreviewMode) => emit('update:previewMode', value),
})

const previewModeOptions = computed<Array<{ title: string; value: PreviewMode; icon: string }>>(
  () => [
    { title: t('formConfig.previewForm'), value: 'form', icon: 'mdi-form-select' },
    { title: t('formConfig.previewTable'), value: 'table', icon: 'mdi-table' },
    { title: t('formConfig.previewMobileTable'), value: 'mobile', icon: 'mdi-cellphone' },
  ],
)

const previewTemplates = computed(() =>
  sortDialogTemplates(
    props.draftTemplates
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
    props.draftTemplates
      .filter(isPreviewSupportedTableTemplate)
      .filter((template) => template.tableVisible === true),
  ),
)

const previewTableScrollStyle = computed(() => ({
  '--sapling-form-config-preview-table-columns': String(previewTableTemplates.value.length),
}))

const previewMobileTemplates = computed(() =>
  getMobileTableHeaders(
    props.draftTemplates.filter(isPreviewSupportedTableTemplate).map((template) => ({
      ...template,
      key: template.name,
      title: getPreviewFieldLabel(template),
    })),
  ),
)

const activePreviewCount = computed(() => {
  if (previewModeModel.value === 'table') {
    return previewTableTemplates.value.length
  }

  if (previewModeModel.value === 'mobile') {
    return previewMobileTemplates.value.length
  }

  return previewTemplates.value.length
})

const previewTitle = computed(() =>
  props.selectedEntityHandle
    ? translateEntity(props.selectedEntityHandle)
    : t('formConfig.preview'),
)

function translateEntity(entityHandle: string): string {
  const key = `navigation.${entityHandle}`
  return te(key) ? t(key) : entityHandle
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

  const key = `${props.selectedEntityHandle}.${template.name}`
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
