<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="400">
    <v-card>
      <v-card-title>Löschen bestätigen</v-card-title>
      <v-card-text>
        Möchtest du diesen Datensatz wirklich löschen?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
  <v-btn text @click="cancel">Abbrechen</v-btn>
  <v-btn color="error" @click="confirm">Löschen</v-btn>
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
