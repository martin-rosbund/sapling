<template>
  <div class="sapling-change-log-detail-value">
    <span v-if="isEmpty" class="sapling-change-log-detail-value__empty">-</span>
    <div
      v-else-if="isMarkdownTemplate"
      class="sapling-change-log-detail-value__markdown glass-panel"
    >
      <SaplingMarkdownContent :source="markdownSource" />
    </div>
    <pre v-else-if="isJsonTemplate" class="sapling-change-log-detail-value__json">{{
      jsonValue
    }}</pre>
    <div v-else-if="canRenderField" class="sapling-change-log-detail-value__field">
      <SaplingDialogEditFieldRenderer
        :template="template!"
        :entity-handle="entityHandle"
        mode="readonly"
        :form-values="fieldValues"
        :visible-templates="[template!]"
        :permissions="referencePermissions"
        :icon-names="[]"
        :is-reference-visible="true"
        :rules="[]"
        :field-disabled="true"
        :reference-field-disabled="true"
        :show-label="false"
        @update-field="handleUpdateField"
        @select-record="handleSelectRecord"
      />
    </div>
    <pre v-else class="sapling-change-log-detail-value__text">{{ fallbackValue }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import SaplingDialogEditFieldRenderer from '@/components/dialog/SaplingDialogEditFieldRenderer.vue'
import { formatValue } from '@/utils/saplingFormatUtil'
import { getEntityValueLabel } from '@/utils/saplingTableUtil'

const props = defineProps<{
  entityHandle: string
  template: EntityTemplate | null
  value: unknown
  payload?: Record<string, unknown> | null
}>()

const isEmpty = computed(() => props.value == null)
const isMarkdownTemplate = computed(() => props.template?.options?.includes('isMarkdown') === true)
const isJsonTemplate = computed(() => props.template?.type === 'JsonType')

const resolvedValue = computed(() => {
  const template = props.template
  if (!template) {
    return props.value
  }

  if (props.payload && Object.prototype.hasOwnProperty.call(props.payload, template.name)) {
    return props.payload[template.name]
  }

  return props.value
})

const canRenderField = computed(() => {
  if (!props.template || isEmpty.value) {
    return false
  }

  if (isMarkdownTemplate.value || isJsonTemplate.value) {
    return false
  }

  if (props.template.isReference && ['1:m', 'm:n'].includes(props.template.kind ?? '')) {
    return false
  }

  if (Array.isArray(resolvedValue.value) && props.template.isReference) {
    return false
  }

  return true
})

const fieldValues = computed<SaplingGenericItem>(() => {
  const template = props.template
  const payload = props.payload ? { ...props.payload } : {}

  if (!template) {
    return payload
  }

  const nextValue = normalizeFieldValue(template, resolvedValue.value)
  payload[template.name] = nextValue

  if (template.type === 'datetime') {
    payload[`${template.name}_date`] = extractDateInputValue(nextValue)
    payload[`${template.name}_time`] = extractTimeInputValue(nextValue)
  }

  return payload
})

const referencePermissions = computed<AccumulatedPermission[]>(() => {
  if (!props.template?.referenceName) {
    return []
  }

  return [{ entityHandle: props.template.referenceName, allowRead: true }]
})

const fallbackValue = computed(() => formatFallbackValue(resolvedValue.value, props.template))
const markdownSource = computed(() => normalizeMarkdownSource(resolvedValue.value))
const jsonValue = computed(() => formatJsonValue(resolvedValue.value))

function normalizeFieldValue(template: EntityTemplate, value: unknown): unknown {
  if (template.isReference && value != null && typeof value !== 'object') {
    return { handle: value }
  }

  if (
    (template.type === 'number' ||
      template.options?.includes('isPercent') ||
      template.options?.includes('isMoney')) &&
    value !== ''
  ) {
    return Number(value)
  }

  if (template.type === 'boolean') {
    return Boolean(value)
  }

  return value
}

function extractDateInputValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    return dateMatch?.[1] ?? ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return ''
}

function extractTimeInputValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const timeMatch = trimmed.match(/(?:T|\s)(\d{2}:\d{2})/)
    if (timeMatch?.[1]) {
      return timeMatch[1]
    }

    const plainTimeMatch = trimmed.match(/^(\d{2}:\d{2})(?::\d{2})?$/)
    return plainTimeMatch?.[1] ?? ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = String(value.getHours()).padStart(2, '0')
    const minutes = String(value.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return ''
}

function formatFallbackValue(value: unknown, template: EntityTemplate | null): string {
  if (value == null) {
    return '-'
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatFallbackValue(entry, template)).join(', ')
  }

  if (template?.isReference && value && typeof value === 'object') {
    return getEntityValueLabel(value as SaplingGenericItem)
  }

  if (typeof value === 'string') {
    return template ? formatValue(value, template.type) : value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value, null, 2)
}

function normalizeMarkdownSource(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value == null) {
    return ''
  }

  return JSON.stringify(value, null, 2)
}

function formatJsonValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return ''
    }

    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return trimmed
    }
  }

  return JSON.stringify(value, null, 2)
}

function handleUpdateField(): void {}

function handleSelectRecord(): void {}
</script>

<style scoped>
.sapling-change-log-detail-value {
  min-width: 0;
}

.sapling-change-log-detail-value__empty {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
}

.sapling-change-log-detail-value__field {
  pointer-events: none;
}

.sapling-change-log-detail-value__field :deep(.v-input__details) {
  display: none;
}

.sapling-change-log-detail-value__field :deep(.v-input),
.sapling-change-log-detail-value__field :deep(.v-selection-control),
.sapling-change-log-detail-value__field :deep(.sapling-field-generic-reference) {
  min-width: 0;
}

.sapling-change-log-detail-value__field :deep(.sapling-field-generic-reference__label) {
  display: none;
}

.sapling-change-log-detail-value__markdown,
.sapling-change-log-detail-value__json {
  max-height: 15rem;
  overflow: auto;
}

.sapling-change-log-detail-value__markdown {
  padding: 0.875rem 1rem;
}

.sapling-change-log-detail-value__json {
  margin: 0;
  padding: 0.875rem 1rem;
  border-radius: 1rem;
  background: rgba(var(--v-theme-surface), 0.76);
  white-space: pre-wrap;
  word-break: break-word;
}

.sapling-change-log-detail-value__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}
</style>
