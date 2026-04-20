<template>
  <div style="display: flex; align-items: center; gap: 8px">
    <SaplingSelectField
      v-bind="props"
      v-model="selectedItems"
      @update:modelValue="onUpdateModelValue"
    />
    <v-btn-group>
      <v-btn
        color="primary"
        :disabled="!selectedItems.length"
        @click="emitAddSelected"
        icon="mdi-plus"
        title="Add selected"
      />
    </v-btn-group>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingSelectAddField } from '@/composables/fields/useSaplingSelectAddField'
import type { SaplingGenericItem } from '@/entity/entity'
import type { FilterQuery } from '@/services/api.generic.service'
import { defineAsyncComponent, watch } from 'vue'

const SaplingSelectField = defineAsyncComponent(() => import('./SaplingFieldSelect.vue'))

const props = defineProps<{
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem[]
  rules?: Array<(v: unknown) => true | string>
  placeholder?: string
  disabled?: boolean
  parentFilter?: FilterQuery
}>()
const emit = defineEmits(['update:modelValue', 'add-selected'])

const { selectedItems } = useSaplingSelectAddField(props)

function emitAddSelected() {
  if (selectedItems.value.length) {
    emit('add-selected', selectedItems.value)
  }
}

function onUpdateModelValue(val: SaplingGenericItem[] | null) {
  emit('update:modelValue', val)
}

watch(selectedItems, (val) => {
  emit('update:modelValue', val)
})
</script>
