<template>
  <div class="sapling-mail-dialog__preview-shell">
    <v-card class="sapling-mail-dialog__helper-card glass-panel">
      <v-card-text class="sapling-mail-dialog__helper-card-text">
        <div class="sapling-mail-dialog__helper-header">
          <span class="sapling-mail-dialog__helper-title">{{
            translate('mail.placeholders')
          }}</span>
          <v-btn-toggle
            :model-value="insertTarget"
            color="primary"
            density="compact"
            mandatory
            @update:model-value="handleInsertTargetUpdate"
          >
            <v-btn variant="outlined" value="subject" size="small">{{
              translate('document.subject')
            }}</v-btn>
            <v-btn variant="outlined" value="body" size="small">{{
              translate('document.content')
            }}</v-btn>
          </v-btn-toggle>
        </div>

        <v-progress-linear v-if="isLoadingPlaceholders" indeterminate color="primary" />
        <div v-else class="sapling-mail-dialog__placeholder-groups">
          <div
            v-for="group in placeholderGroups"
            :key="group.name"
            class="sapling-mail-dialog__placeholder-group"
          >
            <div class="sapling-mail-dialog__placeholder-group-title">{{ group.name }}</div>
            <div class="sapling-mail-dialog__placeholder-chip-list">
              <v-chip
                v-for="placeholder in group.items"
                :key="placeholder.token"
                size="small"
                class="sapling-mail-dialog__placeholder-chip"
                @click="$emit('insert-placeholder', placeholder.token)"
              >
                {{ placeholder.label }}
              </v-chip>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <div class="sapling-mail-dialog__preview-toolbar">
      <span class="sapling-mail-dialog__preview-title">{{ translate('document.preview') }}</span>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-refresh"
        :loading="isPreviewLoading"
        @click="$emit('refresh-preview')"
      >
        {{ translate('mail.refreshPreview') }}
      </v-btn>
    </div>

    <v-card class="sapling-mail-dialog__preview-card glass-panel">
      <v-card-text>
        <div class="sapling-mail-dialog__preview-meta">
          <div v-if="previewFrom">
            <strong>{{ translate('document.from') }}:</strong> {{ previewFrom }}
          </div>
          <div>
            <strong>{{ translate('document.to') }}:</strong> {{ previewTo }}
          </div>
          <div v-if="previewCc">
            <strong>{{ translate('document.cc') }}:</strong> {{ previewCc }}
          </div>
          <div v-if="previewBcc">
            <strong>{{ translate('document.bcc') }}:</strong> {{ previewBcc }}
          </div>
          <div>
            <strong>{{ translate('document.subject') }}:</strong> {{ previewSubject || ' ' }}
          </div>
          <div v-if="attachmentSelectionSummary">
            <strong>{{ translate('document.attachments') }}:</strong>
            {{ attachmentSelectionSummary }}
          </div>
        </div>
        <v-divider class="my-4" />
        <div class="sapling-mail-dialog__preview-html">
          <SaplingMarkdownContent :source="previewMarkdown" />
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import type {
  InsertTarget,
  PlaceholderGroup,
} from '@/components/dialog/mail/SaplingDialogMail.types'

defineProps<{
  placeholderGroups: PlaceholderGroup[]
  insertTarget: InsertTarget
  isLoadingPlaceholders: boolean
  isPreviewLoading: boolean
  previewFrom: string
  previewTo: string
  previewCc: string
  previewBcc: string
  previewSubject: string
  attachmentSelectionSummary: string
  previewMarkdown: string
  translate: (key: string) => string
}>()

const emit = defineEmits<{
  (event: 'update:insertTarget', value: InsertTarget): void
  (event: 'insert-placeholder', value: string): void
  (event: 'refresh-preview'): void
}>()

function handleInsertTargetUpdate(value: InsertTarget | null) {
  if (value) {
    emit('update:insertTarget', value)
  }
}
</script>
