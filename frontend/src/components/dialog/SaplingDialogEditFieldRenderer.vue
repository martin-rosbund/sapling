<template>
  <template v-if="template.isReference && isReferenceVisible">
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
      v-if="template.options?.includes('isPhone')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.isRequired"
      :placeholder="defaultPlaceholder"
      :entity-handle="entityHandle"
      :item-handle="itemHandle"
      :draft-values="formValues"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingMailField
      v-else-if="template.options?.includes('isMail')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.isRequired"
      :placeholder="defaultPlaceholder"
      :entity-handle="entityHandle"
      :item-handle="itemHandle"
      :draft-values="formValues"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingLinkField
      v-else-if="template.options?.includes('isLink')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.isRequired"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingColorField
      v-else-if="template.options?.includes('isColor')"
      :label="plainLabel"
      :model-value="stringValue(template.name)"
      :disabled="fieldDisabled"
      :rules="rules"
      :required="template.isRequired"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingIconField
      v-else-if="template.options?.includes('isIcon')"
      :items="iconNames"
      :model-value="stringValue(template.name)"
      :label="plainLabel"
      :disabled="fieldDisabled"
      :rules="rules"
      :required="template.isRequired"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingFieldPercent
      v-else-if="template.options?.includes('isPercent')"
      :label="requiredLabel"
      :model-value="numberValue(template.name)"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingFieldMoney
      v-else-if="template.options?.includes('isMoney')"
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
      v-else-if="template.type === 'number'"
      :label="requiredLabel"
      :model-value="numberValue(template.name)"
      :disabled="fieldDisabled"
      :required="template.nullable === false"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: unknown) => updateField(template.name, val)"
    />
    <SaplingBooleanField
      v-else-if="template.type === 'boolean'"
      :label="requiredLabel"
      :model-value="booleanValue(template.name)"
      :disabled="fieldDisabled"
      @update:model-value="(val: boolean) => updateField(template.name, val)"
    />
    <SaplingDateTimeField
      v-else-if="template.type === 'datetime'"
      :label="plainLabel"
      :date-value="stringValue(`${template.name}_date`)"
      :time-value="stringValue(`${template.name}_time`)"
      :disabled="fieldDisabled"
      :rules="rules"
      :required="template.isRequired"
      @update:dateValue="(val: string) => updateField(`${template.name}_date`, val)"
      @update:timeValue="(val: string) => updateField(`${template.name}_time`, val)"
    />
    <SaplingDateTypeField
      v-else-if="template.type === 'DateType'"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingTimeField
      v-else-if="template.type === 'time'"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingMarkdownField
      v-else-if="template.options?.includes('isMarkdown')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :rows="8"
      :show-preview="true"
      :disabled="fieldDisabled"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingJsonField
      v-else-if="template.type === 'JsonType'"
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
      :required="template.isRequired"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingPasswordField
      v-else-if="template.options?.includes('isSecurity')"
      :label="requiredLabel"
      :model-value="stringValue(template.name)"
      :maxlength="template.length"
      :disabled="fieldDisabled"
      :required="template.isRequired"
      :placeholder="defaultPlaceholder"
      :rules="rules"
      @update:model-value="(val: string) => updateField(template.name, val)"
    />
    <SaplingShortTextField
      v-else-if="(template.length ?? 0) <= 128"
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FilterQuery } from '@/services/api.generic.service'
import type {
  AccumulatedPermission,
  DialogState,
  EntityTemplate,
} from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import SaplingSingleSelectField from '@/components/dialog/fields/SaplingFieldSingleSelect.vue'
import SaplingBooleanField from '@/components/dialog/fields/SaplingFieldBoolean.vue'
import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue'
import SaplingFieldPercent from '@/components/dialog/fields/SaplingFieldPercent.vue'
import SaplingFieldMoney from '@/components/dialog/fields/SaplingFieldMoney.vue'
import SaplingDateTypeField from '@/components/dialog/fields/SaplingFieldDateType.vue'
import SaplingTimeField from '@/components/dialog/fields/SaplingFieldTime.vue'
import SaplingShortTextField from '@/components/dialog/fields/SaplingFieldShortText.vue'
import SaplingLongTextField from '@/components/dialog/fields/SaplingFieldLongText.vue'
import SaplingColorField from '@/components/dialog/fields/SaplingFieldColor.vue'
import SaplingIconField from '@/components/dialog/fields/SaplingFieldIcon.vue'
import SaplingDateTimeField from '@/components/dialog/fields/SaplingFieldDateTime.vue'
import SaplingPhoneField from '@/components/dialog/fields/SaplingFieldPhone.vue'
import SaplingMailField from '@/components/dialog/fields/SaplingFieldMail.vue'
import SaplingLinkField from '@/components/dialog/fields/SaplingFieldLink.vue'
import SaplingPasswordField from '@/components/dialog/fields/SaplingFieldPassword.vue'
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue'
import SaplingJsonField from '@/components/dialog/fields/SaplingFieldJson.vue'
import SaplingFieldCellDuplicateCheck from '@/components/dialog/fields/SaplingFieldCellDuplicateCheck.vue'
import SaplingFieldAutoKey from '@/components/dialog/fields/SaplingFieldAutoKey.vue'

const props = defineProps<{
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
}>()

const emit = defineEmits<{
  (event: 'update-field', key: string, value: unknown): void
  (event: 'select-record', value: SaplingGenericItem): void
}>()

const { t } = useI18n()

const plainLabel = computed(() => t(`${props.entityHandle}.${props.template.name}`))
const requiredLabel = computed(() =>
  `${plainLabel.value}${props.template.isRequired ? '*' : ''}`,
)
const defaultPlaceholder = computed(() =>
  props.template.default != null ? String(props.template.default) : '',
)
const defaultRawPlaceholder = computed(() =>
  props.template.defaultRaw != null ? String(props.template.defaultRaw) : '',
)
const canReadReference = computed(
  () =>
    props.permissions?.find((entry) => entry.entityHandle === props.template.referenceName)
      ?.allowRead,
)
const jsonValue = computed(() =>
  typeof props.formValues[props.template.name] === 'string'
    ? null
    : props.formValues[props.template.name],
)

function stringValue(fieldName: string): string {
  const value = props.formValues[fieldName]
  return value != null ? String(value) : ''
}

function numberValue(fieldName: string): number {
  return Number(props.formValues[fieldName] ?? null)
}

function booleanValue(fieldName: string): boolean {
  return Boolean(props.formValues[fieldName])
}

function updateField(key: string, value: unknown): void {
  emit('update-field', key, value)
}
</script>
