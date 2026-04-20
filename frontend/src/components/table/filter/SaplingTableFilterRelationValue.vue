<template>
  <SaplingFieldSelect
    :label="$t(`filter.selection`)"
    :entity-handle="entityHandle"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'
import type { SaplingGenericItem } from '@/entity/entity'

const SaplingFieldSelect = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldSelect.vue'),
)

defineProps<{
  entityHandle: string
  modelValue: SaplingGenericItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SaplingGenericItem[]]
}>()
</script>
