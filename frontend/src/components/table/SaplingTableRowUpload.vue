<template>
  <v-dialog :model-value="show" max-width="500px" @update:model-value="onDialogModelValueUpdate">
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
              :rules="[value => !!String(value ?? '').trim() || $t('global.isRequired')]"
            />
          </v-form>
        </v-card-text>
        <SaplingActionUpload
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
import SaplingActionUpload from '../actions/SaplingActionUpload.vue';
import {
  useSaplingTableRowUpload,
  type UseSaplingTableRowUploadEmit,
  type UseSaplingTableRowUploadProps,
} from '@/composables/table/useSaplingTableRowUpload';

const props = defineProps<UseSaplingTableRowUploadProps>();
const emit = defineEmits<UseSaplingTableRowUploadEmit>();

const {
  file,
  description,
  isUploading,
  isLoading,
  formRef,
  onUpload,
  onDialogModelValueUpdate,
} = useSaplingTableRowUpload(props, emit);
</script>
