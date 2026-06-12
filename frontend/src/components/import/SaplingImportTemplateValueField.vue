<template>
  <div class="sapling-import-template-value-field">
    <SaplingDialogEditFieldRenderer
      :template="template"
      :entity-handle="entityHandle"
      mode="create"
      :form-values="formValues"
      :visible-templates="visibleTemplates"
      :permissions="permissions"
      :icon-names="iconNames"
      :is-reference-visible="true"
      :rules="[]"
      :field-disabled="disabled"
      :reference-field-disabled="disabled"
      :show-label="showLabel"
      @update-field="updateField"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'
import SaplingDialogEditFieldRenderer from '@/components/dialog/SaplingDialogEditFieldRenderer.vue'
import { getLocalDateTimeParts, toUtcIsoString } from '@/composables/dialog/saplingDialogEdit.utils'

const props = withDefaults(
  defineProps<{
    modelValue: unknown
    template: EntityTemplate
    entityHandle: string
    visibleTemplates: EntityTemplate[]
    permissions: AccumulatedPermission[] | null
    disabled?: boolean
    showLabel?: boolean
  }>(),
  {
    disabled: false,
    showLabel: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void
}>()

const formValues = reactive<SaplingGenericItem>({})
const iconNames = ref<Array<{ name: string; unicode?: string }>>([])
let iconLoadPromise: Promise<void> | null = null
let referenceLoadRequestId = 0
let isSyncingFromModel = false

async function ensureIconsLoaded(): Promise<void> {
  if (
    iconNames.value.length > 0 ||
    iconLoadPromise ||
    (!props.template.options?.includes('isIcon') && props.template.formConfig?.renderer !== 'icon')
  ) {
    await iconLoadPromise
    return
  }

  iconLoadPromise = import('@/constants/mdi.icons').then((mod) => {
    iconNames.value = mod.mdiIcons
  })
  await iconLoadPromise
}

async function syncFormValue(value: unknown): Promise<void> {
  isSyncingFromModel = true
  try {
    if (isDateTimeTemplate(props.template)) {
      syncDateTimeValue(value)
      return
    }

    if (props.template.isReference && props.template.referenceName) {
      formValues[props.template.name] = await resolveReferenceValue(value)
      return
    }

    formValues[props.template.name] = normalizeInputValue(value)
  } finally {
    isSyncingFromModel = false
  }
}

function syncDateTimeValue(value: unknown): void {
  const parts =
    typeof value === 'string' && value.trim()
      ? getLocalDateTimeParts(value)
      : { date: '', time: '' }

  formValues[`${props.template.name}_date`] = parts.date
  formValues[`${props.template.name}_time`] = parts.time
}

async function resolveReferenceValue(value: unknown): Promise<SaplingGenericItem | null> {
  if (!value) {
    return null
  }

  if (typeof value === 'object') {
    return value as SaplingGenericItem
  }

  const requestId = ++referenceLoadRequestId
  const response = await ApiGenericService.find<SaplingGenericItem>(props.template.referenceName!, {
    filter: { handle: value },
    limit: 1,
    relations: ['m:1'],
  })

  if (requestId !== referenceLoadRequestId) {
    return formValues[props.template.name] as SaplingGenericItem | null
  }

  return response.data[0] ?? null
}

function normalizeInputValue(value: unknown): unknown {
  if (!isBooleanTemplate(props.template) || typeof value !== 'string') {
    return value
  }

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'ja', 'on'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'nein', 'off'].includes(normalized)) {
    return false
  }

  return value
}

function updateField(key: string, value: unknown): void {
  formValues[key] = value

  if (isSyncingFromModel) {
    return
  }

  if (isDateTimeTemplate(props.template)) {
    emitDateTimeValue()
    return
  }

  emit('update:modelValue', normalizeOutputValue(value))
}

function emitDateTimeValue(): void {
  const dateValue = formValues[`${props.template.name}_date`]
  const timeValue = formValues[`${props.template.name}_time`]

  if (!dateValue) {
    emit('update:modelValue', null)
    return
  }

  emit('update:modelValue', toUtcIsoString(String(dateValue), String(timeValue || '00:00')))
}

function normalizeOutputValue(value: unknown): unknown {
  if (props.template.isReference && value && typeof value === 'object') {
    return (value as SaplingGenericItem).handle ?? null
  }

  return value
}

function isDateTimeTemplate(template: EntityTemplate): boolean {
  return template.type === 'datetime' || template.formConfig?.renderer === 'dateTime'
}

function isBooleanTemplate(template: EntityTemplate): boolean {
  return template.type === 'boolean' || template.formConfig?.renderer === 'boolean'
}

watch(
  () => [props.modelValue, props.template.name, props.template.referenceName] as const,
  ([value]) => {
    void syncFormValue(value)
  },
  { immediate: true },
)

watch(
  () => props.template,
  () => {
    void ensureIconsLoaded()
  },
  { immediate: true },
)

onMounted(() => {
  void ensureIconsLoaded()
})
</script>

<style scoped>
.sapling-import-template-value-field {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 40px;
}

.sapling-import-template-value-field :deep(.v-input) {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.sapling-import-template-value-field :deep(.v-input__details) {
  display: none;
}

.sapling-import-template-value-field :deep(.v-input__control) {
  min-height: 40px;
}

.sapling-import-template-value-field :deep(.v-field) {
  min-height: 40px;
  height: 40px;
}

.sapling-import-template-value-field :deep(.v-field__input) {
  min-height: 40px;
  padding-top: 0;
  padding-bottom: 0;
}

.sapling-import-template-value-field :deep(.v-field__append-inner),
.sapling-import-template-value-field :deep(.v-field__prepend-inner) {
  align-items: center;
  align-self: stretch;
  min-height: 40px;
  padding-top: 0;
}

.sapling-import-template-value-field :deep(.v-number-input__control) {
  align-self: stretch;
  height: 40px;
}

.sapling-import-template-value-field :deep(.v-number-input__control .v-btn) {
  height: 40px !important;
}
</style>
