<template>
  <div style="display: flex; align-items: center; gap: 8px;">
    <SaplingSingleSelectField
      v-bind="props"
      v-model="selectedItem"
      @update:modelValue="onUpdateModelValue"
    />
    <v-btn-group>
        <v-btn
            color="primary"
            :disabled="!selectedItem"
            @click="emitAddSelected"
            icon="mdi-plus"
        />
    </v-btn-group>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingSingleSelectAddField } from '@/composables/fields/useSaplingSingleSelectAddField';
import SaplingSingleSelectField from './SaplingSingleSelectField.vue';
import type { SaplingGenericItem } from '@/entity/entity';
import { watch } from 'vue';

const props = defineProps<{
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem,
  rules?: Array<(v: unknown) => true | string>;
}>();
const emit = defineEmits(['update:modelValue', 'add-selected']);

const { selectedItem } = useSaplingSingleSelectAddField(props);

function emitAddSelected() {
  if (selectedItem.value) {
    emit('add-selected', selectedItem.value);
  }
}

function onUpdateModelValue(val: SaplingGenericItem | null) {
  emit('update:modelValue', val);
}

watch(selectedItem, (val) => {
  emit('update:modelValue', val);
});
</script>
