<template>
  <v-dialog :model-value="show" max-width="500px" @update:model-value="onDialogModelValueUpdate">
    <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <v-card-title>{{ isLoading ? '' : $t('document.uploadDocument') }}</v-card-title>
      <v-card-text>
        <template v-if="isLoading">
          <v-skeleton-loader elevation="12" type="article" />
        </template>
        <template v-else>
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
        </template>
      </v-card-text>
      <template v-if="isLoading">
        <v-card-actions>
          <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
            <template v-if="$vuetify.display.mdAndUp"></template>
          </v-btn>
          <v-spacer/>
          <v-btn color="primary" append-icon="mdi-content-save" disabled>
            <template v-if="$vuetify.display.mdAndUp"></template>
          </v-btn>
        </v-card-actions>
      </template>
      <template v-else>
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
