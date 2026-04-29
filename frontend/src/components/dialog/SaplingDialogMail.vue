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
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EntityTemplate, PaginatedResponse } from '@/entity/structure'
import SaplingActionMail from '@/components/actions/SaplingActionMail.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogMailComposer from '@/components/dialog/mail/SaplingDialogMailComposer.vue'
import SaplingDialogMailPreview from '@/components/dialog/mail/SaplingDialogMailPreview.vue'
import type {
  AttachmentOption,
  EmailTemplateItem,
  InsertTarget,
  PlaceholderItem,
  PlaceholderRelationTemplates,
} from '@/components/dialog/mail/SaplingDialogMail.types'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiGenericService from '@/services/api.generic.service'
import ApiMailService from '@/services/api.mail.service'
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'

type MailComposerInstance = InstanceType<typeof SaplingDialogMailComposer> & {
  insertPlaceholderAtCursor?: (target: InsertTarget, token: string) => void
}

type AttachmentItem = {
  handle: number
  filename: string
  mimetype: string
  description?: string | null
  createdAt?: string | null
}

const { isOpen, context, closeMailDialog } = useSaplingMailDialog()
const { pushMessage } = useSaplingMessageCenter()
const currentPersonStore = useCurrentPersonStore()
const { t, te } = useI18n()
const {
  translationService,
  isLoading: isTranslationLoading,
  loadTranslations,
} = useTranslationLoader('global', 'navigation', 'document', 'mail')

const templates = ref<EmailTemplateItem[]>([])
const composer = ref<MailComposerInstance | null>(null)
const placeholders = ref<PlaceholderItem[]>([])
const availableAttachments = ref<AttachmentOption[]>([])
const templateHandle = ref<number | null>(null)
const attachmentHandles = ref<number[]>([])
const toRecipients = ref<string[]>([])
const ccRecipients = ref<string[]>([])
const bccRecipients = ref<string[]>([])
const subject = ref('')
const bodyMarkdown = ref('')
const insertTarget = ref<InsertTarget>('body')
const previewMarkdown = ref('')
const previewSubject = ref('')
const previewTo = ref('')
const previewCc = ref('')
const previewBcc = ref('')
const isLoadingTemplates = ref(false)
const isLoadingPlaceholders = ref(false)
const isLoadingAttachments = ref(false)
const isPreviewLoading = ref(false)
const isSending = ref(false)

const entityLabel = computed(() => {
  const handle = context.value?.entityHandle

  if (!handle) {
    return ''
  }

  return translateIfExists(`navigation.${handle}`, handle)
})

const senderEmail = computed(() => currentPersonStore.person?.email?.trim() ?? '')

const dialogTitle = computed(() => {
  if (!context.value?.entityHandle) {
    return translate('mail.compose')
  }

  return translateWithParams('mail.composeForEntity', { entity: entityLabel.value })
})

const heroStats = computed(() => [
  { label: translate('mail.recipientsStat'), value: toRecipients.value.length },
  { label: translate('mail.templatesStat'), value: templates.value.length },
  { label: translate('mail.attachmentsStat'), value: attachmentHandles.value.length },
])

const placeholderGroups = computed(() => {
  const groups = new Map<string, PlaceholderItem[]>()

  for (const placeholder of placeholders.value) {
    const current = groups.get(placeholder.group) ?? []
    current.push(placeholder)
    groups.set(placeholder.group, current)
  }

  return [...groups.entries()].map(([name, items]) => ({
    name,
    items,
  }))
})

const attachmentSelectionSummary = computed(() => {
  if (attachmentHandles.value.length === 0) {
    return ''
  }

  return availableAttachments.value
    .filter((attachment) => attachmentHandles.value.includes(attachment.handle))
    .map((attachment) => attachment.filename)
    .join(', ')
})

watch(
  isOpen,
  async (open) => {
    if (!open || !context.value) {
      resetState()
      return
    }

    initializeFromContext()
    await loadTranslations()
    await Promise.all([loadTemplates(), loadAttachments(), currentPersonStore.fetchCurrentPerson()])
    await loadPlaceholders()
    await refreshPreview()
  },
  { immediate: true },
)

function handleVisibilityChange(value: boolean) {
  if (!value) {
    closeMailDialog()
  }
}

function initializeFromContext() {
  toRecipients.value = normalizeRecipients(context.value?.initialTo)
  ccRecipients.value = []
  bccRecipients.value = []
  subject.value = context.value?.initialSubject ?? ''
  bodyMarkdown.value = ''
  templateHandle.value = null
  attachmentHandles.value = []
  insertTarget.value = 'body'
}

function resetState() {
  templates.value = []
  placeholders.value = []
  availableAttachments.value = []
  templateHandle.value = null
  attachmentHandles.value = []
  toRecipients.value = []
  ccRecipients.value = []
  bccRecipients.value = []
  subject.value = ''
  bodyMarkdown.value = ''
  insertTarget.value = 'body'
  previewMarkdown.value = ''
  previewSubject.value = ''
  previewTo.value = ''
  previewCc.value = ''
  previewBcc.value = ''
  isLoadingTemplates.value = false
  isLoadingPlaceholders.value = false
  isLoadingAttachments.value = false
  isPreviewLoading.value = false
  isSending.value = false
}

async function loadTemplates() {
  if (!context.value?.entityHandle) {
    return
  }

  isLoadingTemplates.value = true

  try {
    const response = (await ApiGenericService.find<EmailTemplateItem>('emailTemplate', {
      filter: {
        entity: context.value.entityHandle,
        isActive: true,
      },
      orderBy: {
        name: 'ASC',
      },
      limit: 100,
      relations: ['entity'],
    })) as PaginatedResponse<EmailTemplateItem>

    templates.value = response.data ?? []
  } catch (error) {
    console.error('Error loading email templates:', error)
    pushMessage(
      'warning',
      'mail.templatesLoadFailed',
      'mail.templatesLoadFailedDescription',
      'mail',
    )
    templates.value = []
  } finally {
    isLoadingTemplates.value = false
  }
}

async function applyTemplate() {
  const selectedTemplate = templates.value.find(
    (template) => template.handle === templateHandle.value,
  )
  if (selectedTemplate) {
    subject.value = selectedTemplate.subjectTemplate
    bodyMarkdown.value = selectedTemplate.bodyMarkdown
  }

  await refreshPreview()
}

async function loadPlaceholders() {
  if (!context.value?.entityHandle) {
    return
  }

  isLoadingPlaceholders.value = true

  try {
    const rootTemplates = await ApiMailService.getEntityTemplate(context.value.entityHandle)
    const relatedTemplates = await Promise.all(
      rootTemplates.filter(isSupportedPlaceholderRelation).map(async (template) => ({
        parent: template,
        children: await ApiMailService.getEntityTemplate(template.referenceName ?? ''),
      })),
    )

    await loadPlaceholderTranslations(relatedTemplates)

    placeholders.value = buildPlaceholderItems(rootTemplates, relatedTemplates)
  } catch (error) {
    console.error('Error loading placeholders:', error)
    pushMessage(
      'warning',
      'mail.placeholdersLoadFailed',
      'mail.placeholdersLoadFailedDescription',
      'mail',
    )
    placeholders.value = []
  } finally {
    isLoadingPlaceholders.value = false
  }
}

async function loadAttachments() {
  if (!context.value?.entityHandle || context.value.itemHandle == null) {
    availableAttachments.value = []
    attachmentHandles.value = []
    return
  }

  isLoadingAttachments.value = true

  try {
    const response = (await ApiGenericService.find<AttachmentItem>('document', {
      filter: {
        reference: String(context.value.itemHandle),
        entity: context.value.entityHandle,
      },
      orderBy: {
        createdAt: 'DESC',
      },
      limit: 100,
    })) as PaginatedResponse<AttachmentItem>

    availableAttachments.value = (response.data ?? []).map((document) => ({
      handle: document.handle,
      filename: document.filename,
      title: document.description
        ? `${document.filename} - ${document.description}`
        : `${document.filename} (${document.mimetype})`,
    }))
  } catch (error) {
    console.error('Error loading attachments:', error)
    pushMessage(
      'warning',
      'mail.attachmentsLoadFailed',
      'mail.attachmentsLoadFailedDescription',
      'mail',
    )
    availableAttachments.value = []
  } finally {
    isLoadingAttachments.value = false
  }
}

async function refreshPreview() {
  if (!context.value?.entityHandle) {
    return
  }

  isPreviewLoading.value = true

  try {
    const preview = await ApiMailService.preview({
      entityHandle: context.value.entityHandle,
      itemHandle: context.value.itemHandle,
      templateHandle: templateHandle.value ?? undefined,
      subject: subject.value,
      bodyMarkdown: bodyMarkdown.value,
      to: toRecipients.value,
      cc: ccRecipients.value,
      bcc: bccRecipients.value,
      draftValues: context.value.draftValues,
      attachmentHandles: attachmentHandles.value,
    })

    previewMarkdown.value = preview.bodyMarkdown
    previewSubject.value = preview.subject
    previewTo.value = preview.to.join(', ')
    previewCc.value = preview.cc.join(', ')
    previewBcc.value = preview.bcc.join(', ')
  } catch (error) {
    console.error('Error previewing email:', error)
    pushMessage('error', 'mail.previewFailed', 'mail.previewFailedDescription', 'mail')
  } finally {
    isPreviewLoading.value = false
  }
}

async function sendMail() {
  if (!context.value?.entityHandle) {
    return
  }

  isSending.value = true

  try {
    await ApiMailService.send({
      entityHandle: context.value.entityHandle,
      itemHandle: context.value.itemHandle,
      templateHandle: templateHandle.value ?? undefined,
      subject: subject.value,
      bodyMarkdown: bodyMarkdown.value,
      to: toRecipients.value,
      cc: ccRecipients.value,
      bcc: bccRecipients.value,
      draftValues: context.value.draftValues,
      attachmentHandles: attachmentHandles.value,
    })

    pushMessage('success', 'mail.sendQueued', 'mail.sendQueuedDescription', 'mail')
    closeMailDialog()
  } catch (error) {
    console.error('Error sending email:', error)
    pushMessage('error', 'mail.sendFailed', 'mail.sendFailedDescription', 'mail')
  } finally {
    isSending.value = false
  }
}

function insertPlaceholder(token: string) {
  composer.value?.insertPlaceholderAtCursor?.(insertTarget.value, token)
}

function buildPlaceholderItems(
  rootTemplates: EntityTemplate[],
  relationTemplates: PlaceholderRelationTemplates[],
): PlaceholderItem[] {
  const items: PlaceholderItem[] = []
  const currentEntityHandle = context.value?.entityHandle ?? ''

  for (const template of rootTemplates.filter(isScalarPlaceholderTemplate)) {
    items.push({
      token: `{{${template.name}}}`,
      label: translateTemplateLabel(currentEntityHandle, template.name),
      group: entityLabel.value || translate('mail.placeholderGroupCurrent'),
    })
  }

  for (const relation of relationTemplates) {
    const relationEntityHandle = relation.parent.referenceName ?? ''

    for (const child of relation.children.filter(isScalarPlaceholderTemplate)) {
      items.push({
        token: `{{${relation.parent.name}.${child.name}}}`,
        label: translateTemplateLabel(relationEntityHandle, child.name),
        group: translateTemplateLabel(currentEntityHandle, relation.parent.name),
      })
    }
  }

  return items
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.token === item.token) === index,
    )
    .sort((left, right) => left.label.localeCompare(right.label))
}

function isScalarPlaceholderTemplate(template: EntityTemplate): boolean {
  return !template.isReference && template.isPersistent !== false
}

function isSupportedPlaceholderRelation(template: EntityTemplate): boolean {
  return !!template.isReference && !!template.referenceName && template.kind !== '1:m'
}

async function loadPlaceholderTranslations(relationTemplates: PlaceholderRelationTemplates[]) {
  const namespaces = new Set<string>()
  const currentEntityHandle = context.value?.entityHandle

  if (currentEntityHandle) {
    namespaces.add(currentEntityHandle)
  }

  for (const relation of relationTemplates) {
    if (relation.parent.referenceName) {
      namespaces.add(relation.parent.referenceName)
    }
  }

  if (namespaces.size === 0) {
    return
  }

  await translationService.value.prepare(...namespaces)
}

function normalizeRecipients(value: string[] | string | null | undefined): string[] {
  const values = Array.isArray(value) ? value : String(value ?? '').split(/[;,]/)

  return values.map((entry) => String(entry).trim()).filter(Boolean)
}

function translateTemplateLabel(entityHandle: string, property: string): string {
  if (!entityHandle) {
    return property
  }

  return translateIfExists(`${entityHandle}.${property}`, property)
}

function translate(key: string): string {
  return t(key)
}

function translateIfExists(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback
}

function translateWithParams(key: string, params: Record<string, unknown>): string {
  return te(key) ? t(key, params) : key
}
</script>
