<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="400" persistent>
    <v-card>
      <v-card-title>{{ $t('global.confirmDelete') }}</v-card-title>
      <v-card-text>{{ $t('global.confirmDeleteQuestion') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
          <v-btn text @click="cancel">{{ $t('global.cancel') }}</v-btn>
          <v-btn color="error" @click="confirm">{{ $t('global.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
  modelValue: boolean,
  item: any | null
}>();

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

function onDialogUpdate(val: boolean) {
  emit('update:modelValue', val);
}
function cancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
function confirm() {
  emit('update:modelValue', false);
  emit('confirm');
}
</script>
