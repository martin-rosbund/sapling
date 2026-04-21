<template>
  <div class="sapling-inline-cluster">
    <SaplingSingleSelectField
      v-bind="props"
      v-model="selectedItem"
      @update:modelValue="onUpdateModelValue"
    />
    <v-btn-group>
      <v-btn color="primary" :disabled="!selectedItem" @click="emitAddSelected" icon="mdi-plus" />
    </v-btn-group>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingSingleSelectAddField } from '@/composables/fields/useSaplingSingleSelectAddField'
import SaplingSingleSelectField from './SaplingFieldSingleSelect.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import type { FilterQuery } from '@/services/api.generic.service'
import { watch } from 'vue'

const props = defineProps<{
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem
  rules?: Array<(v: unknown) => true | string>
  placeholder?: string
  disabled?: boolean
  parentFilter?: FilterQuery
}>()
const emit = defineEmits(['update:modelValue', 'add-selected'])

const { selectedItem } = useSaplingSingleSelectAddField(props)

function emitAddSelected() {
  if (selectedItem.value) {
    emit('add-selected', selectedItem.value)
  }
}

function onUpdateModelValue(val: SaplingGenericItem | null) {
  emit('update:modelValue', val)
}

watch(selectedItem, (val) => {
  emit('update:modelValue', val)
})
</script>
