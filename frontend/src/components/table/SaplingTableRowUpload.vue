<template>
  <v-dialog :model-value="show" max-width="500px" @update:model-value="onDialogModelValueUpdate">
    <v-card class="glass-panel tilt-content sapling-dialog-compact-card" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <div class="sapling-dialog-shell">
        <template v-if="isLoading">
          <SaplingDialogHero loading :loading-stats-count="2" />

          <div class="sapling-dialog-form-body">
            <v-skeleton-loader elevation="12" type="article" />
          </div>
        </template>

        <template v-else>
          <SaplingDialogHero :eyebrow="uploadSubtitle" :title="$t('document.uploadDocument')" />

          <div class="sapling-dialog-form-body">
            <v-form ref="formRef" class="sapling-dialog-form" @submit.prevent="onUpload">
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
          </div>
        </template>

        <template v-if="isLoading">
          <div class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
              <v-spacer/>
              <v-btn color="primary" append-icon="mdi-content-save" disabled>
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
            </v-card-actions>
          </div>
        </template>
        <template v-else>
          <SaplingActionUpload
            :isLoading="isUploading"
            @upload="onUpload"
            @close="$emit('close')"
          />
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionUpload from '../actions/SaplingActionUpload.vue';
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue';
import {
  useSaplingTableRowUpload,
  type UseSaplingTableRowUploadEmit,
  type UseSaplingTableRowUploadProps,
} from '@/composables/table/useSaplingTableRowUpload';

const props = defineProps<UseSaplingTableRowUploadProps>();
const emit = defineEmits<UseSaplingTableRowUploadEmit>();
const { t, te } = useI18n();

const {
  file,
  description,
  isUploading,
  isLoading,
  formRef,
  onUpload,
  onDialogModelValueUpdate,
} = useSaplingTableRowUpload(props, emit);

const entityLabel = computed(() => {
  const key = `navigation.${props.entityHandle}`;
  return te(key) ? t(key) : props.entityHandle;
});

const uploadSubtitle = computed(() => file.value?.name || entityLabel.value);
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
