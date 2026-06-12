<template>
  <template v-if="template.genericReference">
    <SaplingFieldGenericReference :item="formValues" :template="template" :label="plainLabel" />
  </template>
  <template v-else-if="template.isReference && isReferenceVisible">
    <SaplingSingleSelectField
      v-if="canReadReference"
      :label="requiredLabel"
      :entity-handle="template.referenceName ?? ''"
      :model-value="formValues[template.name]"
      :rules="rules"
      :disabled="referenceFieldDisabled"
      :parent-filter="referenceParentFilter"
      :placeholder="defaultRawPlaceholder"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
  </template>
  <template v-else>
    <SaplingPhoneField
      v-if="template.options?.includes('isPhone') || isRenderer('phone')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="isRequired"
      :placeholder="defaultPlaceholder"
      :entity-handle="entityHandle"
      :item-handle="itemHandle"
      :draft-values="formValues"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingMailField
      v-else-if="template.options?.includes('isMail') || isRenderer('mail')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="isRequired"
      :placeholder="defaultPlaceholder"
      :entity-handle="entityHandle"
      :item-handle="itemHandle"
      :draft-values="formValues"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingLinkField
      v-else-if="template.options?.includes('isLink') || isRenderer('link')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.isRequired"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingFieldTeamsRecipient
      v-else-if="
        ['teamsSubscription', 'inboxSubscription'].includes(entityHandle) &&
        template.name === 'recipientField'
      "
      :label="requiredLabel"
      :model-value="stringValue(template.name) || null"
      :disabled="fieldDisabled"
      :rules="rules"
      :entity-reference="formValues.entity"
      :allow-collection-recipients="entityHandle === 'inboxSubscription'"
      @update:model-value="(val: string | null) => updateField(template.name, val)"
    />
    <SaplingColorField
      v-else-if="template.options?.includes('isColor') || isRenderer('color')"
      :label="plainLabel"
      :model-value="stringValue(template.name)"
      :disabled="fieldDisabled"
      :rules="rules"
      :required="isRequired"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingIconField
      v-else-if="template.options?.includes('isIcon') || isRenderer('icon')"
      :items="iconNames"
      :model-value="stringValue(template.name)"
      :label="plainLabel"
      :disabled="fieldDisabled"
      :rules="rules"
      :required="isRequired"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingFieldPercent
      v-else-if="template.options?.includes('isPercent') || isRenderer('percent')"
      :label="requiredLabel"
      :model-value="numberValue(template.name)"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingFieldMoney
      v-else-if="template.options?.includes('isMoney') || isRenderer('money')"
      :label="requiredLabel"
      :model-value="numberValue(template.name)"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingFieldCellDuplicateCheck
      v-else-if="template.options?.includes('isDuplicateCheck') && mode === 'create'"
      :label="requiredLabel"
      :entity-handle="entityHandle"
      :model-value="formValues[template.name]"
      :model-name="template.name"
      :rules="rules"
      :placeholder="defaultPlaceholder"
      :disabled="template.options?.includes('isReadOnly')"
      :required="template.isRequired"
      :entity-templates="visibleTemplates"
      @update:modelValue="(val: unknown) => updateField(template.name, val)"
      @select-record="(record: SaplingGenericItem) => emit('select-record', record)"
    />
    <SaplingNumberField
      v-else-if="
        template.options?.includes('isNumeric') ||
        template.type === 'number' ||
        isRenderer('number')
      "
      :label="requiredLabel"
      :model-value="numberValue(template.name)"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      :step="numberStep"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingBooleanField
      v-else-if="template.type === 'boolean' || isRenderer('boolean')"
      :label="requiredLabel"
      :model-value="booleanValue(template.name)"
      :disabled="fieldDisabled"
      @update:model-value="(val: boolean) => updateField(template.name, val)"
    />
    <SaplingDateTimeField
      v-else-if="template.type === 'datetime' || isRenderer('dateTime')"
      :label="plainLabel"
      :date-value="stringValue(`${template.name}_date`)"
      :time-value="stringValue(`${template.name}_time`)"
      :disabled="fieldDisabled"
      :rules="rules"
      :required="isRequired"
      @update:dateValue="(val: string) => updateField(`${template.name}_date`, val)"
      @update:timeValue="(val: string) => updateField(`${template.name}_time`, val)"
    />
    <SaplingFieldEventRecurrence
      v-else-if="entityHandle === 'event' && template.name === 'recurrenceRule'"
      :label="plainLabel"
      :model-value="stringValue(template.name) || null"
      :start-date-value="stringValue('startDate_date')"
      :start-time-value="stringValue('startDate_time')"
      :is-all-day="booleanValue('isAllDay')"
      :disabled="fieldDisabled"
      @update:model-value="(val: string | null) => updateField(template.name, val)"
    />
    <SaplingDateTypeField
      v-else-if="template.type === 'DateType' || isRenderer('date')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingTimeField
      v-else-if="template.type === 'time' || isRenderer('time')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingMarkdownField
      v-else-if="template.options?.includes('isMarkdown') || isRenderer('markdown')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :rows="8"
      :show-preview="true"
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <v-select
      v-else-if="isRenderer('select') || template.customField?.type === 'select'"
      :label="requiredLabel"
      :model-value="stringValue(template.name) || null"
      :items="customFieldOptions"
      item-title="label"
      item-value="value"
      density="comfortable"
      clearable
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <v-select
      v-else-if="isRenderer('multiSelect') || template.customField?.type === 'multiSelect'"
      :label="requiredLabel"
      :model-value="arrayValue(template.name)"
      :items="customFieldOptions"
      item-title="label"
      item-value="value"
      density="comfortable"
      chips
      multiple
      clearable
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingJsonField
      v-else-if="template.type === 'JsonType' || isRenderer('json')"
      :label="requiredLabel"
      :model-value="jsonValue"
      :disabled="fieldDisabled"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingFieldAutoKey
      v-else-if="template.options?.includes('isAutoKey')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="isRequired"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingPasswordField
      v-else-if="template.options?.includes('isSecurity') || isRenderer('password')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="isRequired"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingShortTextField
      v-else-if="
        isRenderer('shortText') || ((template.length ?? 0) <= 128 && !isRenderer('longText'))
      "
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingLongTextField
      v-else
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      auto-grow
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
  </template>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterQuery } from '@/services/api.generic.service'
import type { AccumulatedPermission, DialogState, EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'

// Field components are loaded on demand. A typical edit dialog only renders a
// small subset of these per template, so lazy-loading keeps the initial bundle
// of any view that pulls in SaplingDialogEdit (TableView, EventView, ...) small.
const SaplingSingleSelectField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldSingleSelect.vue'),
)
const SaplingBooleanField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldBoolean.vue'),
)
const SaplingNumberField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldNumber.vue'),
)
const SaplingFieldPercent = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldPercent.vue'),
)
const SaplingFieldMoney = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldMoney.vue'),
)
const SaplingDateTypeField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldDateType.vue'),
)
const SaplingTimeField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldTime.vue'),
)
const SaplingShortTextField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldShortText.vue'),
)
const SaplingLongTextField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldLongText.vue'),
)
const SaplingColorField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldColor.vue'),
)
const SaplingIconField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldIcon.vue'),
)
const SaplingDateTimeField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldDateTime.vue'),
)
const SaplingPhoneField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldPhone.vue'),
)
const SaplingMailField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldMail.vue'),
)
const SaplingLinkField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldLink.vue'),
)
const SaplingPasswordField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldPassword.vue'),
)
const SaplingMarkdownField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldMarkdown.vue'),
)
const SaplingJsonField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldJson.vue'),
)
const SaplingFieldCellDuplicateCheck = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldCellDuplicateCheck.vue'),
)
const SaplingFieldAutoKey = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldAutoKey.vue'),
)
const SaplingFieldTeamsRecipient = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldTeamsRecipient.vue'),
)
const SaplingFieldEventRecurrence = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldEventRecurrence.vue'),
)
const SaplingFieldGenericReference = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldGenericReference.vue'),
)

const props = withDefaults(
  defineProps<{
    template: EntityTemplate
    entityHandle: string
    itemHandle?: string | number
    mode: DialogState
    formValues: SaplingGenericItem
    visibleTemplates: EntityTemplate[]
    permissions: AccumulatedPermission[] | null
    iconNames: Array<{ name: string; unicode?: string }>
    isReferenceVisible: boolean
    rules: Array<(v: unknown) => true | string>
    fieldDisabled: boolean
    referenceFieldDisabled: boolean
    referenceParentFilter?: FilterQuery
    showLabel?: boolean
  }>(),
  {
    showLabel: true,
  },
)

const emit = defineEmits<{
  (event: 'update-field', key: string, value: unknown): void
  (event: 'select-record', value: SaplingGenericItem): void
}>()

const { t } = useI18n()

const configuredRenderer = computed(() => props.template.formConfig?.renderer ?? null)
const isRequired = computed(() => {
  if (props.template.formConfig?.required === true) {
    return true
  }

  if (props.template.formConfig?.required === false && props.template.nullable !== false) {
    return false
  }

  return props.template.isRequired === true
})
const plainLabel = computed(() => {
  if (!props.showLabel) {
    return ''
  }

  const configuredLabel = props.template.formConfig?.label?.trim()
  if (configuredLabel) {
    return configuredLabel
  }

  return t(`${props.entityHandle}.${props.template.name}`)
})
const requiredLabel = computed(() => {
  if (!props.showLabel) {
    return ''
  }

  return `${plainLabel.value}${isRequired.value ? '*' : ''}`
})
const defaultPlaceholder = computed(() =>
  props.template.formConfig?.placeholder != null
    ? String(props.template.formConfig.placeholder)
    : props.template.default != null
      ? String(props.template.default)
      : '',
)
const defaultRawPlaceholder = computed(() =>
  props.template.defaultRaw != null ? String(props.template.defaultRaw) : '',
)
const canReadReference = computed(
  () =>
    props.permissions?.find((entry) => entry.entityHandle === props.template.referenceName)
      ?.allowRead,
)
const jsonValue = computed(() => props.formValues[props.template.name])
const customFieldOptions = computed(() => props.template.customField?.options ?? [])
const numberStep = computed(() => (props.template.options?.includes('isNumeric') ? 1 : undefined))

function stringValue(fieldName: string): string {
  const value = props.formValues[fieldName]
  return value != null ? String(value) : ''
}

function numberValue(fieldName: string): number | null {
  const value = props.formValues[fieldName]
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function booleanValue(fieldName: string): boolean {
  return Boolean(props.formValues[fieldName])
}

function arrayValue(fieldName: string): unknown[] {
  const value = props.formValues[fieldName]
  return Array.isArray(value) ? value : []
}

function isRenderer(renderer: string): boolean {
  return configuredRenderer.value === renderer
}

function updateField(key: string, value: unknown): void {
  emit('update-field', key, value)
}
</script>
