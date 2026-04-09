<template>
  <v-dialog :model-value="show" max-width="500px" @update:model-value="onDialogModelValueUpdate">
    <v-card class="glass-panel tilt-content sapling-dialog-compact-card" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <div class="sapling-dialog-shell">
        <template v-if="isLoading">
          <section class="sapling-dialog-hero">
            <div class="sapling-dialog-hero__copy sapling-dialog-hero__loading-copy">
              <v-skeleton-loader type="heading, text" />
            </div>

            <div class="sapling-dialog-hero__stats">
              <v-skeleton-loader
                v-for="item in 2"
                :key="item"
                class="sapling-dialog-hero__loading-stat"
                type="article"
              />
            </div>
          </section>

          <div class="sapling-dialog-form-body">
            <v-skeleton-loader elevation="12" type="article" />
          </div>
        </template>

        <template v-else>
          <section class="sapling-dialog-hero">
            <div class="sapling-dialog-hero__copy">
              <div class="sapling-dialog-hero__eyebrow">{{ uploadSubtitle }}</div>
              <div class="sapling-dialog-hero__title-row">
                <h2 class="sapling-dialog-hero__title">{{ $t('document.uploadDocument') }}</h2>
              </div>
            </div>
          </section>

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

        <v-divider class="my-2"></v-divider>
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
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionUpload from '../actions/SaplingActionUpload.vue';
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
const descriptionLength = computed(() => description.value.trim().length);
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
