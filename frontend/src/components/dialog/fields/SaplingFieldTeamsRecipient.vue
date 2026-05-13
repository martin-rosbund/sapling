<template>
  <v-select
    :label="label"
    :items="recipientFields"
    :model-value="modelValue"
    :rules="rules"
    :disabled="disabled || !selectedEntityHandle"
    item-title="label"
    item-value="value"
    hide-details="auto"
    @update:model-value="(value) => emit('update:modelValue', value)"
  />
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import { useGenericStore } from '@/stores/genericStore'

type RecipientFieldOption = {
  label: string
  value: string
}

const props = defineProps<{
  label: string
  modelValue?: string | null
  disabled?: boolean
  rules?: Array<(v: unknown) => true | string>
  entityReference?: unknown
  allowCollectionRecipients?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
}>()

const { t, te } = useI18n()
const genericStore = useGenericStore()
const loadedEntityHandle = ref('')

const selectedEntityHandle = computed(() => {
  const value = props.entityReference

  if (typeof value === 'string') {
    return value.trim()
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ''
  }

  const record = value as SaplingGenericItem
  return typeof record.handle === 'string' ? record.handle.trim() : ''
})

function translateFieldLabel(entityHandle: string, fieldName: string): string {
  const translationKey = `${entityHandle}.${fieldName}`
  return te(translationKey) ? t(translationKey) : fieldName
}

function isRecipientFieldTemplate(template: EntityTemplate): boolean {
  if (template.isReference !== true || template.referenceName !== 'person') {
    return false
  }

  if (props.allowCollectionRecipients) {
    return true
  }

  return ['m:1', '1:1'].includes(template.kind ?? '')
}

function buildDirectRecipientFields(
  entityHandle: string,
  templates: EntityTemplate[],
): RecipientFieldOption[] {
  return templates.filter(isRecipientFieldTemplate).map((template) => ({
    label: translateFieldLabel(entityHandle, template.name),
    value: template.name,
  }))
}

function buildNestedRecipientFields(
  entityHandle: string,
  templates: EntityTemplate[],
): RecipientFieldOption[] {
  return templates
    .filter(
      (template) =>
        template.isReference === true &&
        template.kind === 'm:1' &&
        typeof template.referenceName === 'string' &&
        template.referenceName.trim().length > 0 &&
        template.referenceName !== 'person',
    )
    .flatMap((relationTemplate) => {
      const relatedEntityHandle = relationTemplate.referenceName?.trim() ?? ''
      if (!relatedEntityHandle) {
        return []
      }

      const relatedTemplates = genericStore.getState(relatedEntityHandle).entityTemplates
      const relationLabel = translateFieldLabel(entityHandle, relationTemplate.name)

      return relatedTemplates.filter(isRecipientFieldTemplate).map((template) => ({
        label: `${relationLabel} -> ${translateFieldLabel(relatedEntityHandle, template.name)}`,
        value: `${relationTemplate.name}.${template.name}`,
      }))
    })
}

const recipientFields = computed<RecipientFieldOption[]>(() => {
  const entityHandle = loadedEntityHandle.value
  if (!entityHandle) {
    return []
  }

  const templates = genericStore.getState(entityHandle).entityTemplates
  const options = [
    ...buildDirectRecipientFields(entityHandle, templates),
    ...buildNestedRecipientFields(entityHandle, templates),
  ]

  return [...new Map(options.map((option) => [option.value, option])).values()].sort(
    (left, right) => left.label.localeCompare(right.label),
  )
})

watch(
  selectedEntityHandle,
  async (value) => {
    loadedEntityHandle.value = value

    if (!value) {
      if (props.modelValue) {
        emit('update:modelValue', null)
      }
      return
    }

    await genericStore.loadGeneric(value, 'global')
    const nestedEntityHandles = [
      ...new Set(
        genericStore
          .getState(value)
          .entityTemplates.filter(
            (template) =>
              template.isReference === true &&
              template.kind === 'm:1' &&
              typeof template.referenceName === 'string' &&
              template.referenceName.trim().length > 0 &&
              template.referenceName !== 'person',
          )
          .map((template) => template.referenceName?.trim())
          .filter((entityHandle): entityHandle is string => Boolean(entityHandle)),
      ),
    ]

    if (nestedEntityHandles.length > 0) {
      await genericStore.loadGenericMany(
        nestedEntityHandles.map((entityHandle) => ({
          entityHandle,
          namespaces: ['global'],
        })),
      )
    }

    if (
      props.modelValue &&
      !recipientFields.value.some((entry) => entry.value === props.modelValue)
    ) {
      emit('update:modelValue', null)
    }
  },
  { immediate: true },
)
</script>
