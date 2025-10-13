<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="600">
    <v-card>
      <v-card-title>
        {{ mode === 'edit' ? 'Datensatz bearbeiten' : 'Neuen Datensatz anlegen' }}
      </v-card-title>
      <v-card-text>
        <!-- Formularfelder hier einfügen -->
        <div style="min-height: 100px;">Formular folgt ...</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
  <v-btn text @click="cancel">Abbrechen</v-btn>
  <v-btn color="primary" @click="save">Speichern</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
  modelValue: boolean,
  mode: 'create' | 'edit',
  item: any | null
}>();

const emit = defineEmits(['update:modelValue', 'save', 'cancel']);

function onDialogUpdate(val: boolean) {
  emit('update:modelValue', val);
}
function cancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
function save() {
  emit('update:modelValue', false);
  emit('save');
}
</script>
