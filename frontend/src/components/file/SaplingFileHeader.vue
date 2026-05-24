<template>
  <SaplingSurface as="header" class="sapling-document-header">
    <v-skeleton-loader
      v-if="isLoading"
      class="sapling-document-header__skeleton"
      type="heading, text"
    />

    <template v-else>
      <div class="sapling-document-header__copy">
        <div class="sapling-document-header__icon">
          <v-icon :icon="headerIcon" size="24" />
        </div>

        <div class="sapling-document-header__text">
          <p class="sapling-document-header__eyebrow">{{ $t('document.preview') }}</p>
          <h2 class="sapling-document-title">{{ headerTitle }}</h2>
        </div>
      </div>

      <div class="sapling-document-header__actions">
        <v-chip
          v-if="hasSelection"
          class="sapling-document-header__badge"
          size="small"
          variant="tonal"
          color="primary"
        >
          {{ previewBadge }}
        </v-chip>

        <v-btn
          :disabled="!selectedHandle"
          class="sapling-document-download-btn"
          color="primary"
          variant="flat"
          prepend-icon="mdi-download"
          @click="onDownloadDocument"
        >
          {{ $t('global.download') }}
        </v-btn>
      </div>
    </template>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import '@/assets/styles/SaplingFileHeader.css'
import { computed } from 'vue'
import { i18n } from '@/i18n'
import SaplingSurface from '@/components/common/SaplingSurface.vue'

const props = defineProps<{
  selectedHandle: string
  selectedFilename: string
  previewType: string
  hasSelection: boolean
  isLoading: boolean
  onDownloadDocument: () => void
}>()

const previewBadge = computed(() => {
  if (props.previewType === 'none') {
    return i18n.global.t('document.file')
  }

  return props.previewType.toUpperCase()
})

const headerIcon = computed(() => {
  if (!props.hasSelection) {
    return 'mdi-file-search-outline'
  }

  if (props.previewType === 'eml') {
    return 'mdi-email-outline'
  }

  if (props.previewType === 'json') {
    return 'mdi-code-json'
  }

  if (props.previewType === 'none') {
    return 'mdi-file-alert-outline'
  }

  return 'mdi-file-eye-outline'
})

const headerTitle = computed(() => {
  if (!props.hasSelection) {
    return i18n.global.t('document.selectFileForPreview')
  }

  return props.selectedFilename || props.selectedHandle
})
</script>
