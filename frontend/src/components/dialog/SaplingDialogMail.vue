<template>
  <v-dialog
    :model-value="isOpen"
    min-width="95vw"
    min-height="95vh"
    max-width="95vw"
    max-height="95vh"
    persistent
    @update:model-value="handleVisibilityChange"
  >
    <v-card class="glass-panel sapling-mail-dialog" elevation="12">
      <div class="sapling-mail-dialog__shell">
        <v-card-title class="sapling-mail-dialog__header">
          <SaplingDialogHero
            :loading="isTranslationLoading"
            :eyebrow="translate('mail.title')"
            :title="dialogTitle"
            :stats="heroStats"
            :stats-columns="3"
            stats-layout="compact"
            :loading-stats-count="3"
          />
        </v-card-title>

        <v-card-text class="sapling-mail-dialog__content">
          <div v-if="isTranslationLoading" class="sapling-mail-dialog__scroll">
            <div class="sapling-mail-dialog__grid">
              <v-skeleton-loader class="glass-panel" type="article, article, article" />
              <v-skeleton-loader class="glass-panel" type="article, article, article" />
            </div>
          </div>
          <div v-else class="sapling-mail-dialog__scroll">
            <div class="sapling-mail-dialog__grid">
              <SaplingDialogMailComposer
                ref="composer"
                :templates="templates"
                :template-handle="templateHandle"
                :to-recipients="toRecipients"
                :cc-recipients="ccRecipients"
                :bcc-recipients="bccRecipients"
                :sender-email="senderEmail"
                :selected-sender-email="selectedSenderEmail"
                :sender-options="senderOptions"
                :is-loading-sender-options="isLoadingSenderOptions"
                :subject="subject"
                :body-markdown="bodyMarkdown"
                :available-attachments="availableAttachments"
                :attachment-handles="attachmentHandles"
                :attachment-selection-summary="attachmentSelectionSummary"
                :is-loading-templates="isLoadingTemplates"
                :is-loading-attachments="isLoadingAttachments"
                :has-item-handle="context?.itemHandle != null"
                :translate="translate"
                @update:template-handle="templateHandle = $event"
                @update:to-recipients="toRecipients = $event"
                @update:cc-recipients="ccRecipients = $event"
                @update:bcc-recipients="bccRecipients = $event"
                @update:selected-sender-email="selectedSenderEmail = $event"
                @update:subject="subject = $event"
                @update:body-markdown="bodyMarkdown = $event"
                @update:attachment-handles="attachmentHandles = $event"
                @focus-subject="insertTarget = 'subject'"
                @focus-body="insertTarget = 'body'"
                @apply-template="applyTemplate"
              />

              <SaplingDialogMailPreview
                :placeholder-groups="placeholderGroups"
                :insert-target="insertTarget"
                :is-loading-placeholders="isLoadingPlaceholders"
                :is-preview-loading="isPreviewLoading"
                :preview-from="senderEmail"
                :preview-to="previewTo"
                :preview-cc="previewCc"
                :preview-bcc="previewBcc"
                :preview-subject="previewSubject"
                :attachment-selection-summary="attachmentSelectionSummary"
                :preview-markdown="previewMarkdown"
                :translate="translate"
                @update:insert-target="insertTarget = $event"
                @insert-placeholder="insertPlaceholder"
                @refresh-preview="refreshPreview"
              />
            </div>
          </div>
        </v-card-text>

        <v-card-actions v-if="isTranslationLoading" class="sapling-dialog__actions justify-end">
          <v-skeleton-loader type="button" width="112" />
          <v-skeleton-loader type="button" width="140" />
          <v-skeleton-loader type="button" width="112" />
        </v-card-actions>
        <SaplingActionMail
          v-else
          :close="closeMailDialog"
          :refresh-preview="refreshPreview"
          :send="sendMail"
          :is-preview-loading="isPreviewLoading"
          :is-sending="isSending"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import SaplingActionMail from '@/components/actions/SaplingActionMail.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogMailComposer from '@/components/dialog/mail/SaplingDialogMailComposer.vue'
import SaplingDialogMailPreview from '@/components/dialog/mail/SaplingDialogMailPreview.vue'
import { useSaplingDialogMailEditor } from '@/composables/dialog/useSaplingDialogMailEditor'

const {
  applyTemplate,
  availableAttachments,
  attachmentHandles,
  attachmentSelectionSummary,
  bccRecipients,
  bodyMarkdown,
  ccRecipients,
  closeMailDialog,
  composer,
  context,
  dialogTitle,
  handleVisibilityChange,
  heroStats,
  insertPlaceholder,
  insertTarget,
  isLoadingAttachments,
  isLoadingPlaceholders,
  isLoadingSenderOptions,
  isLoadingTemplates,
  isOpen,
  isPreviewLoading,
  isSending,
  isTranslationLoading,
  placeholderGroups,
  previewBcc,
  previewCc,
  previewMarkdown,
  previewSubject,
  previewTo,
  refreshPreview,
  selectedSenderEmail,
  sendMail,
  senderEmail,
  senderOptions,
  subject,
  templateHandle,
  templates,
  toRecipients,
  translate,
} = useSaplingDialogMailEditor()
</script>
