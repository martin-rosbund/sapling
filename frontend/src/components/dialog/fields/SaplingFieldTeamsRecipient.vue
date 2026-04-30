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

const props = defineProps<{
  label: string
  modelValue?: string | null
  disabled?: boolean
  rules?: Array<(v: unknown) => true | string>
  entityReference?: unknown
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
}>()

const { t } = useI18n()
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

const recipientFields = computed(() => {
  const entityHandle = loadedEntityHandle.value
  if (!entityHandle) {
    return []
  }

  const templates = genericStore.getState(entityHandle).entityTemplates
  return templates
    .filter(
      (template: EntityTemplate) => template.isReference && template.options?.includes('isPerson'),
    )
    .map((template: EntityTemplate) => {
      const translationKey = `${entityHandle}.${template.name}`
      const translatedLabel = t(translationKey)

      return {
        label: translatedLabel !== translationKey ? translatedLabel : template.name,
        value: template.name,
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label))
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
