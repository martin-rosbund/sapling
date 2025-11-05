<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <v-dialog :model-value="modelValue" @update:model-value="handleDialogUpdate" max-width="400" persistent>
    <v-card>
      <v-card-title>{{ $t('global.confirmDelete') }}</v-card-title>
      <v-card-text>{{ $t('global.confirmDeleteQuestion') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="handleCancel">{{ $t('global.cancel') }}</v-btn>
        <v-btn color="error" @click="handleConfirm">{{ $t('global.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import type { FormType } from '@/entity/structure';
import { defineProps, defineEmits } from 'vue';
import { useEntityDeleteDialog } from '@/composables/dialog/useEntityDeleteDialog';

const props = defineProps<{
  modelValue: boolean,
  item: FormType | null
}>();
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const {
  onDialogUpdate,
  cancel,
  confirm,
} = useEntityDeleteDialog(props.modelValue, props.item);

function handleDialogUpdate(val: boolean) {
  onDialogUpdate(val, emit);
}
function handleCancel() {
  cancel(emit, () => emit('cancel'));
}
function handleConfirm() {
  confirm(emit, () => emit('confirm'));
}
</script>
