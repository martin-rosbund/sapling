<template>
  <v-dialog :model-value="show" max-width="500px" @update:model-value="val => !val && $emit('close')">
    <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <v-card-title>{{ $t('document.uploadDocument') }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onUpload">
          <v-file-input
            v-model="file"
            :label="$t('document.selectFile')"
            accept="*"
            required
            prepend-icon="mdi-file"
          />
          <v-text-field
            v-model="description"
            :label="$t('document.description')"
            prepend-icon="mdi-text"
          />
        </v-form>
      </v-card-text>
      <sapling-upload-action
        :loading="loading"
        @upload="onUpload"
        @close="$emit('close')"
      />
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import ApiService from '@/services/api.service';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import type { SaplingGenericItem } from '@/entity/entity';
import SaplingUploadAction from '../actions/SaplingUploadAction.vue';

const props = defineProps<{ show: boolean; item: SaplingGenericItem | null; entityName: string }>();
const emit = defineEmits(['close', 'uploaded']);

const file = ref<File | null>(null);
const description = ref('');
const loading = ref(false);
const formRef = ref();

async function onUpload() {
  if (!file.value) return;
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file.value);
    formData.append('typeHandle', 'document');
    formData.append('description', description.value);
    // entityName = props.entityName, reference = item.handle
    await ApiService.uploadDocument(props.entityName, props.item?.handle, formData);
    emit('uploaded');
  } catch {
    // Fehlerbehandlung (optional Toast)
    loading.value = false;
  }
  loading.value = false;
}
</script>
