<template>
  <v-dialog :model-value="show" max-width="500px" @update:model-value="val => !val && $emit('close')">
    <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto sapling-skeleton-fullheight"
        elevation="12"
        type="card-avatar, text, text, actions"/>
      <template v-else>
        <v-card-title>{{ $t('document.uploadDocument') }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="onUpload">
            <v-file-input
              v-model="file"
              :label="$t('document.selectDocument')"
              accept="*"
              required
              prepend-icon="mdi-file"
            />
            <v-text-field
              v-model="description"
              :label="$t('document.description')"
              prepend-icon="mdi-text"
              required
              :rules="[v => !!(v && v.trim())]"
            />
          </v-form>
        </v-card-text>
        <sapling-action-upload
          :isLoading="isUploading"
          @upload="onUpload"
          @close="$emit('close')"
        />
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import type { SaplingGenericItem } from '@/entity/entity';
import SaplingActionUpload from '../actions/SaplingActionUpload.vue';

import { useSaplingTableRowUpload } from '@/composables/table/useSaplingTableRowUpload';

const props = defineProps<{ show: boolean; item: SaplingGenericItem | null; entityHandle: string }>();
const emit = defineEmits(['close', 'uploaded']);

const { file, description, isUploading, isLoading, formRef, upload } = useSaplingTableRowUpload(
  props.entityHandle,
  props.item?.handle
);

async function onUpload() {
  if (formRef.value) {
    const result = await formRef.value.validate();
    if (!result.valid) return;
  }
  const success = await upload();
  if (success) emit('uploaded');
}
</script>
