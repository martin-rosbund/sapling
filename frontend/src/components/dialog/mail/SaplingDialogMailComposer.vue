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

    <div class="sapling-mail-dialog__sender">
      <span class="sapling-mail-dialog__sender-label">{{ translate('document.from') }}</span>
      <v-select
        v-if="senderOptions.length > 1"
        class="sapling-mail-dialog__sender-select"
        :model-value="selectedSenderEmail"
        :items="senderItems"
        item-title="title"
        item-value="value"
        density="comfortable"
        hide-details
        :loading="isLoadingSenderOptions"
        variant="underlined"
        @update:model-value="handleSenderUpdate"
      />
      <v-chip v-else size="small" variant="tonal" color="primary">
        {{ selectedSenderEmail || senderEmail || senderFallbackLabel }}
      </v-chip>
    </div>

    <v-combobox
      :model-value="toRecipients"
      :label="translate('document.to')"
      multiple
      chips
      closable-chips
      clearable
      hide-selected
      hide-details="auto"
      :delimiters="[',', ';']"
      @update:model-value="handleToUpdate"
    />

    <div class="sapling-mail-dialog__meta-grid">
      <v-combobox
        :model-value="ccRecipients"
        :label="translate('document.cc')"
        multiple
        chips
        closable-chips
        clearable
        hide-selected
        hide-details="auto"
        :delimiters="[',', ';']"
        @update:model-value="handleCcUpdate"
      />
      <v-combobox
        :model-value="bccRecipients"
        :label="translate('document.bcc')"
        multiple
        chips
        closable-chips
        clearable
        hide-selected
        hide-details="auto"
        :delimiters="[',', ';']"
        @update:model-value="handleBccUpdate"
      />
    </div>

    <v-text-field
      ref="subjectField"
      :model-value="subject"
      :label="translate('document.subject')"
      hide-details="auto"
      @focus="handleSubjectFocus"
      @click="captureSubjectSelection"
      @keyup="captureSubjectSelection"
      @select="captureSubjectSelection"
      @blur="captureSubjectSelection"
      @update:model-value="handleSubjectUpdate"
    />

    <SaplingMarkdownField
      ref="markdownField"
      :model-value="bodyMarkdown"
      :label="translate('document.content')"
      :rows="10"
      :show-preview="false"
      @focus="emit('focus-body')"
      @update:model-value="handleBodyMarkdownUpdate"
    />

    <v-card class="sapling-mail-dialog__helper-card glass-panel">
      <v-card-text class="sapling-mail-dialog__helper-card-text">
        <div class="sapling-mail-dialog__helper-header">
          <span class="sapling-mail-dialog__helper-title">{{
            translate('document.attachments')
          }}</span>
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
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue'
import type {
  AttachmentOption,
  EmailTemplateItem,
  InsertTarget,
  MailSenderOption,
} from '@/components/dialog/mail/SaplingDialogMail.types'

type TextSelectionInput = HTMLInputElement | HTMLTextAreaElement

type SubjectFieldInstance = {
  $el?: Element | null
}

type MarkdownFieldInstance = InstanceType<typeof SaplingMarkdownField> & {
  insertTextAtCursor?: (text: string) => void
}

const props = defineProps<{
  templates: EmailTemplateItem[]
  templateHandle: number | null
  toRecipients: string[]
  ccRecipients: string[]
  bccRecipients: string[]
  senderEmail: string
  selectedSenderEmail: string
  senderOptions: MailSenderOption[]
  isLoadingSenderOptions: boolean
  subject: string
  bodyMarkdown: string
  availableAttachments: AttachmentOption[]
  attachmentHandles: number[]
  attachmentSelectionSummary: string
  isLoadingTemplates: boolean
  isLoadingAttachments: boolean
  hasItemHandle: boolean
  translate: (key: string) => string
}>()

const emit = defineEmits<{
  (event: 'update:templateHandle', value: number | null): void
  (event: 'update:toRecipients', value: string[]): void
  (event: 'update:ccRecipients', value: string[]): void
  (event: 'update:bccRecipients', value: string[]): void
  (event: 'update:selectedSenderEmail', value: string): void
  (event: 'update:subject', value: string): void
  (event: 'update:bodyMarkdown', value: string): void
  (event: 'update:attachmentHandles', value: number[]): void
  (event: 'focus-subject'): void
  (event: 'focus-body'): void
  (event: 'apply-template'): void
}>()

const { locale } = useI18n()
const subjectField = ref<SubjectFieldInstance | null>(null)
const markdownField = ref<MarkdownFieldInstance | null>(null)
const subjectSelectionStart = ref(0)
const subjectSelectionEnd = ref(0)
const senderFallbackLabel = computed(() =>
  locale.value === 'de' ? 'Keine Absenderadresse hinterlegt' : 'No sender address available',
)
const senderItems = computed(() =>
  props.senderOptions.map((option) => ({
    title: buildSenderTitle(option),
    value: option.email,
  })),
)

function handleTemplateUpdate(value: number | null | undefined) {
  emit('update:templateHandle', value ?? null)
  emit('apply-template')
}

function normalizeRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .flatMap((entry) => String(entry ?? '').split(/[;,]/))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, array) => array.indexOf(entry) === index)
}

function handleToUpdate(value: unknown) {
  emit('update:toRecipients', normalizeRecipients(value))
}

function handleCcUpdate(value: unknown) {
  emit('update:ccRecipients', normalizeRecipients(value))
}

function handleBccUpdate(value: unknown) {
  emit('update:bccRecipients', normalizeRecipients(value))
}

function handleSenderUpdate(value: string | null | undefined) {
  emit('update:selectedSenderEmail', value ?? '')
}

function handleSubjectUpdate(value: string) {
  emit('update:subject', value)
}

function handleBodyMarkdownUpdate(value: string) {
  emit('update:bodyMarkdown', value)
}

function handleAttachmentUpdate(value: number[]) {
  emit('update:attachmentHandles', value)
}

function handleSubjectFocus() {
  captureSubjectSelection()
  emit('focus-subject')
}

function captureSubjectSelection() {
  const input = getSubjectInput()

  if (!input) {
    return
  }

  subjectSelectionStart.value = input.selectionStart ?? input.value.length
  subjectSelectionEnd.value = input.selectionEnd ?? subjectSelectionStart.value
}

function insertPlaceholderAtCursor(target: InsertTarget, token: string) {
  if (target === 'subject') {
    insertIntoSubject(token)
    return
  }

  markdownField.value?.insertTextAtCursor?.(token)
}

function insertIntoSubject(token: string) {
  const currentValue = props.subject ?? ''
  const start = clampSelection(subjectSelectionStart.value, currentValue.length)
  const end = clampSelection(subjectSelectionEnd.value, currentValue.length)
  const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`
  const nextCursor = start + token.length

  emit('update:subject', nextValue)

  nextTick(() => {
    const input = getSubjectInput()

    if (!input) {
      return
    }

    input.focus()
    input.setSelectionRange(nextCursor, nextCursor)
    subjectSelectionStart.value = nextCursor
    subjectSelectionEnd.value = nextCursor
  })
}

function getSubjectInput(): TextSelectionInput | null {
  const root = subjectField.value?.$el

  if (!(root instanceof HTMLElement)) {
    return null
  }

  return root.querySelector('input, textarea')
}

function clampSelection(value: number, max: number): number {
  return Math.max(0, Math.min(value, max))
}

function buildSenderTitle(option: MailSenderOption): string {
  const displayName = option.displayName?.trim()

  if (displayName && displayName !== option.email) {
    return `${displayName} <${option.email}>`
  }

  return option.email
}

defineExpose({
  insertPlaceholderAtCursor,
})
</script>
