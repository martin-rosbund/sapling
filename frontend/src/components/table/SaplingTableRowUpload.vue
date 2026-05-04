<template>
  <v-dialog :model-value="show" @update:model-value="onDialogModelValueUpdate" class="sapling-dialog-medium">
    <v-card
      class="glass-panel tilt-content sapling-dialog-compact-card"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <div class="sapling-dialog-shell">
        <template v-if="isLoading">
          <SaplingDialogHero loading :loading-stats-count="2" />

          <div class="sapling-dialog-form-body">
            <v-skeleton-loader elevation="12" type="article" />
          </div>
        </template>

        <template v-else>
          <SaplingDialogHero
            :eyebrow="uploadSubtitle"
            :title="$t('document.uploadDocument')"
            :stats="uploadStats"
          />

          <div class="sapling-dialog-form-body">
            <div class="sapling-dialog-form sapling-upload">
              <div
                class="sapling-upload-dropzone glass-panel"
                :class="{ 'sapling-upload-dropzone--active': isDragActive }"
                role="button"
                tabindex="0"
                @click="openFilePicker"
                @keydown.enter.prevent="openFilePicker"
                @keydown.space.prevent="openFilePicker"
                @dragenter.prevent="onDragEnter"
                @dragover.prevent="onDragOver"
                @dragleave.prevent="onDragLeave"
                @drop.prevent="onDrop"
              >
                <input
                  ref="fileInputRef"
                  class="sapling-upload-native-input"
                  type="file"
                  multiple
                  @change="onNativeFileInputChange"
                />

                <v-icon class="sapling-upload-dropzone__icon" icon="mdi-cloud-upload-outline" />

                <div class="sapling-upload-dropzone__copy">
                  <strong>{{ $t('document.selectDocuments') }}</strong>
                  <span>{{ $t('document.dropDocuments') }}</span>
                  <span>{{ $t('document.maxFileSizeHint', { size: maxFileSizeInMb }) }}</span>
                </div>

                <v-btn
                  color="primary"
                  prepend-icon="mdi-paperclip"
                  variant="tonal"
                  @click.stop="openFilePicker"
                >
                  {{ $t('document.selectDocuments') }}
                </v-btn>
              </div>

              <v-alert
                v-if="oversizedFiles.length"
                class="mb-4"
                type="warning"
                variant="tonal"
                density="comfortable"
              >
                {{ $t('document.maxFileSizeExceeded', { size: maxFileSizeInMb }) }}
              </v-alert>

              <div v-if="files.length" class="sapling-upload-selection">
                <div class="sapling-upload-selection__header">
                  <span>{{ $t('document.filesSelected', { count: files.length }) }}</span>
                </div>

                <div class="sapling-upload-selection__chips">
                  <v-chip
                    v-for="(currentFile, index) in files"
                    :key="getFileKey(currentFile, index)"
                    class="sapling-upload-selection__chip"
                    closable
                    :color="currentFile.size > maxFileSizeBytes ? 'warning' : undefined"
                    prepend-icon="mdi-file-outline"
                    variant="tonal"
                    @click:close="removeFile(index)"
                  >
                    {{ currentFile.name }} - {{ formatFileSize(currentFile.size) }}
                  </v-chip>
                </div>
              </div>

              <v-text-field
                v-model="description"
                :label="$t('document.description')"
                :hint="$t('document.descriptionHint')"
                persistent-hint
                prepend-icon="mdi-text"
              />
            </div>
          </div>
        </template>

        <template v-if="isLoading">
          <div class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
              <v-spacer />
              <v-btn color="primary" append-icon="mdi-content-save" disabled>
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
            </v-card-actions>
          </div>
        </template>
        <template v-else>
          <SaplingActionUpload
            :is-loading="isUploading"
            :disabled="isUploadDisabled"
            @upload="onUpload"
            @close="$emit('close')"
          />
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DOCUMENT_MAX_FILE_SIZE_MB } from '@/constants/project.constants'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingActionUpload from '../actions/SaplingActionUpload.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import {
  useSaplingTableRowUpload,
  type UseSaplingTableRowUploadEmit,
  type UseSaplingTableRowUploadProps,
} from '@/composables/table/useSaplingTableRowUpload'

const props = defineProps<UseSaplingTableRowUploadProps>()
const emit = defineEmits<UseSaplingTableRowUploadEmit>()
const { t, te } = useI18n()

const { files, description, isUploading, isLoading, setFiles, removeFile, onUpload, onDialogModelValueUpdate } =
  useSaplingTableRowUpload(props, emit)

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragActive = ref(false)
const dragDepth = ref(0)

const entityLabel = computed(() => {
  const key = `navigation.${props.entityHandle}`
  return te(key) ? t(key) : props.entityHandle
})

const maxFileSizeInMb = DOCUMENT_MAX_FILE_SIZE_MB
const maxFileSizeBytes = computed(() => maxFileSizeInMb * 1024 * 1024)
const oversizedFiles = computed(() =>
  files.value.filter((currentFile) => currentFile.size > maxFileSizeBytes.value),
)
const isUploadDisabled = computed(
  () => isUploading.value || files.value.length === 0 || oversizedFiles.value.length > 0,
)

const uploadSubtitle = computed(() => {
  if (files.value.length === 0) {
    return entityLabel.value
  }

  if (files.value.length === 1) {
    return files.value[0]?.name || entityLabel.value
  }

  return t('document.filesSelected', { count: files.value.length })
})

const uploadStats = computed(() => [
  {
    label: t('document.selectedFilesLabel'),
    value: files.value.length,
  },
  {
    label: t('document.maxFileSizeLabel'),
    value: `${maxFileSizeInMb} MB`,
  },
])

function openFilePicker() {
  fileInputRef.value?.click()
}

function onNativeFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  setFiles(target?.files ?? null)

  if (target) {
    target.value = ''
  }
}

function onDragEnter() {
  dragDepth.value += 1
  isDragActive.value = true
}

function onDragOver() {
  isDragActive.value = true
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    isDragActive.value = false
  }
}

function onDrop(event: DragEvent) {
  dragDepth.value = 0
  isDragActive.value = false
  setFiles(event.dataTransfer?.files ?? null, { append: true })
}

function getFileKey(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`
}

function formatFileSize(size: number) {
  const fileSizeInMb = size / (1024 * 1024)

  return `${fileSizeInMb.toLocaleString(undefined, {
    minimumFractionDigits: fileSizeInMb < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  })} MB`
}
</script>

<style scoped>
.sapling-upload {
  display: grid;
  gap: 1rem;
}

.sapling-upload-dropzone {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border: 1px dashed rgba(var(--v-theme-primary), 0.45);
  border-radius: 20px;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background-color 0.2s ease;
}

.sapling-upload-dropzone--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateY(-1px);
}

.sapling-upload-dropzone__icon {
  font-size: 2.25rem;
  color: rgb(var(--v-theme-primary));
}

.sapling-upload-dropzone__copy {
  display: grid;
  gap: 0.35rem;
}

.sapling-upload-dropzone__copy span {
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.sapling-upload-native-input {
  display: none;
}

.sapling-upload-selection {
  display: grid;
  gap: 0.75rem;
}

.sapling-upload-selection__header {
  font-size: 0.95rem;
  font-weight: 600;
}

.sapling-upload-selection__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sapling-upload-selection__chip {
  max-width: 100%;
}
</style>
