<template>
  <div class="sapling-mail-dialog__form">
    <v-select
      :model-value="templateHandle"
      :items="templates"
      item-title="name"
      item-value="handle"
      :label="translate('mail.template')"
      clearable
      :loading="isLoadingTemplates"
      hide-details="auto"
      @update:model-value="handleTemplateUpdate"
    />

    <v-text-field
      :model-value="toInput"
      :label="translate('document.to')"
      placeholder="alice@example.com; bob@example.com"
      hide-details="auto"
      @update:model-value="handleToUpdate"
    />

    <div class="sapling-mail-dialog__meta-grid">
      <v-text-field
        :model-value="ccInput"
        :label="translate('document.cc')"
        placeholder="team@example.com"
        hide-details="auto"
        @update:model-value="handleCcUpdate"
      />
      <v-text-field
        :model-value="bccInput"
        :label="translate('document.bcc')"
        placeholder="audit@example.com"
        hide-details="auto"
        @update:model-value="handleBccUpdate"
      />
    </div>

    <v-text-field
      :model-value="subject"
      :label="translate('document.subject')"
      hide-details="auto"
      @focus="$emit('focus-subject')"
      @update:model-value="handleSubjectUpdate"
    />

    <SaplingMarkdownField
      :model-value="bodyMarkdown"
      :label="translate('document.content')"
      :rows="10"
      :show-preview="false"
      @update:model-value="handleBodyMarkdownUpdate"
    />

    <v-card class="sapling-mail-dialog__helper-card glass-panel">
      <v-card-text class="sapling-mail-dialog__helper-card-text">
        <div class="sapling-mail-dialog__helper-header">
          <span class="sapling-mail-dialog__helper-title">{{ translate('document.attachments') }}</span>
          <v-chip size="small" variant="tonal">{{ attachmentHandles.length }}</v-chip>
        </div>

        <v-alert
          v-if="!hasItemHandle"
          type="info"
          variant="tonal"
          density="compact"
          :text="translate('mail.attachmentsAvailableAfterSave')"
        />

        <template v-else>
          <v-autocomplete
            :model-value="attachmentHandles"
            :items="availableAttachments"
            item-title="title"
            item-value="handle"
            :label="translate('mail.attachDocuments')"
            multiple
            chips
            closable-chips
            clearable
            :loading="isLoadingAttachments"
            hide-details="auto"
            @update:model-value="handleAttachmentUpdate"
          />
          <div v-if="attachmentSelectionSummary" class="sapling-mail-dialog__attachment-summary">
            {{ attachmentSelectionSummary }}
          </div>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue';
import type {
  AttachmentOption,
  EmailTemplateItem,
} from '@/components/dialog/mail/SaplingDialogMail.types';

const props = defineProps<{
  templates: EmailTemplateItem[];
  templateHandle: number | null;
  toInput: string;
  ccInput: string;
  bccInput: string;
  subject: string;
  bodyMarkdown: string;
  availableAttachments: AttachmentOption[];
  attachmentHandles: number[];
  attachmentSelectionSummary: string;
  isLoadingTemplates: boolean;
  isLoadingAttachments: boolean;
  hasItemHandle: boolean;
  translate: (key: string) => string;
}>();

const emit = defineEmits<{
  (event: 'update:templateHandle', value: number | null): void;
  (event: 'update:toInput', value: string): void;
  (event: 'update:ccInput', value: string): void;
  (event: 'update:bccInput', value: string): void;
  (event: 'update:subject', value: string): void;
  (event: 'update:bodyMarkdown', value: string): void;
  (event: 'update:attachmentHandles', value: number[]): void;
  (event: 'focus-subject'): void;
  (event: 'apply-template'): void;
}>();

function handleTemplateUpdate(value: number | null | undefined) {
  emit('update:templateHandle', value ?? null);
  emit('apply-template');
}

function handleToUpdate(value: string) {
  emit('update:toInput', value);
}

function handleCcUpdate(value: string) {
  emit('update:ccInput', value);
}

function handleBccUpdate(value: string) {
  emit('update:bccInput', value);
}

function handleSubjectUpdate(value: string) {
  emit('update:subject', value);
}

function handleBodyMarkdownUpdate(value: string) {
  emit('update:bodyMarkdown', value);
}

function handleAttachmentUpdate(value: number[]) {
  emit('update:attachmentHandles', value);
}
</script>