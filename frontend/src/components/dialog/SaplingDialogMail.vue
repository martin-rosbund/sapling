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
            :eyebrow="translate('mail.title')"
            :title="dialogTitle"
            :stats="heroStats"
            :stats-columns="3"
            stats-layout="compact"
          />
        </v-card-title>

        <v-card-text class="sapling-mail-dialog__content">
          <div class="sapling-mail-dialog__scroll">
            <div class="sapling-mail-dialog__grid">
            <div class="sapling-mail-dialog__form">
              <v-select
                v-model="templateHandle"
                :items="templates"
                item-title="name"
                item-value="handle"
                :label="translate('mail.template')"
                clearable
                :loading="isLoadingTemplates"
                hide-details="auto"
                @update:model-value="applyTemplate"
              />

              <v-text-field
                v-model="toInput"
                :label="translate('document.to')"
                placeholder="alice@example.com; bob@example.com"
                hide-details="auto"
              />

              <div class="sapling-mail-dialog__meta-grid">
                <v-text-field
                  v-model="ccInput"
                  :label="translate('document.cc')"
                  placeholder="team@example.com"
                  hide-details="auto"
                />
                <v-text-field
                  v-model="bccInput"
                  :label="translate('document.bcc')"
                  placeholder="audit@example.com"
                  hide-details="auto"
                />
              </div>

              <v-text-field
                v-model="subject"
                :label="translate('document.subject')"
                hide-details="auto"
                @focus="insertTarget = 'subject'"
              />

              <SaplingMarkdownField
                :model-value="bodyMarkdown"
                :label="translate('document.content')"
                :rows="10"
                :show-preview="false"
                @update:model-value="bodyMarkdown = $event"
              />

              <v-card class="sapling-mail-dialog__helper-card" variant="outlined">
                <v-card-text class="sapling-mail-dialog__helper-card-text">
                  <div class="sapling-mail-dialog__helper-header">
                    <span class="sapling-mail-dialog__helper-title">{{ translate('document.attachments') }}</span>
                    <v-chip size="small" variant="tonal">{{ attachmentHandles.length }}</v-chip>
                  </div>

                  <v-alert
                    v-if="!context?.itemHandle"
                    type="info"
                    variant="tonal"
                    density="compact"
                    :text="translate('mail.attachmentsAvailableAfterSave')"
                  />

                  <template v-else>
                    <v-autocomplete
                      v-model="attachmentHandles"
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
                    />
                    <div v-if="attachmentSelectionSummary" class="sapling-mail-dialog__attachment-summary">
                      {{ attachmentSelectionSummary }}
                    </div>
                  </template>
                </v-card-text>
              </v-card>
            </div>

            <div class="sapling-mail-dialog__preview-shell">
              <v-card class="sapling-mail-dialog__helper-card" variant="outlined">
                <v-card-text class="sapling-mail-dialog__helper-card-text">
                  <div class="sapling-mail-dialog__helper-header">
                    <span class="sapling-mail-dialog__helper-title">{{ translate('mail.placeholders') }}</span>
                    <v-btn-toggle v-model="insertTarget" color="primary" density="compact" mandatory>
                      <v-btn value="subject" size="small">{{ translate('document.subject') }}</v-btn>
                      <v-btn value="body" size="small">{{ translate('document.content') }}</v-btn>
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
                          variant="outlined"
                          class="sapling-mail-dialog__placeholder-chip"
                          @click="insertPlaceholder(placeholder.token)"
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
                  @click="refreshPreview"
                >
                  {{ translate('mail.refreshPreview') }}
                </v-btn>
              </div>

              <v-card class="sapling-mail-dialog__preview-card" variant="outlined">
                <v-card-text>
                  <div class="sapling-mail-dialog__preview-meta">
                    <div><strong>{{ translate('document.to') }}:</strong> {{ previewTo }}</div>
                    <div v-if="previewCc"><strong>{{ translate('document.cc') }}:</strong> {{ previewCc }}</div>
                    <div v-if="previewBcc"><strong>{{ translate('document.bcc') }}:</strong> {{ previewBcc }}</div>
                    <div><strong>{{ translate('document.subject') }}:</strong> {{ previewSubject || ' ' }}</div>
                    <div v-if="attachmentSelectionSummary"><strong>{{ translate('document.attachments') }}:</strong> {{ attachmentSelectionSummary }}</div>
                  </div>
                  <v-divider class="my-4" />
                  <div class="sapling-mail-dialog__preview-html" v-html="previewHtml" />
                </v-card-text>
              </v-card>
            </div>
            </div>
          </div>
        </v-card-text>

        <div class="sapling-mail-dialog__footer">
          <v-card-actions>
            <v-btn variant="text" prepend-icon="mdi-close" @click="closeMailDialog">
              {{ translate('global.close') }}
            </v-btn>
            <v-spacer />
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-eye-outline"
              :loading="isPreviewLoading"
              @click="refreshPreview"
            >
              {{ translate('mail.reloadPreview') }}
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-send"
              :loading="isSending"
              @click="sendMail"
            >
              {{ translate('mail.send') }}
            </v-btn>
          </v-card-actions>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { EntityTemplate, PaginatedResponse } from '@/entity/structure';
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue';
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import ApiGenericService from '@/services/api.generic.service';
import ApiMailService from '@/services/api.mail.service';
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog';
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter';

type EmailTemplateItem = {
  handle: number;
  name: string;
  subjectTemplate: string;
  bodyMarkdown: string;
};

type AttachmentItem = {
  handle: number;
  filename: string;
  mimetype: string;
  description?: string | null;
  createdAt?: string | null;
};

type AttachmentOption = {
  handle: number;
  title: string;
  filename: string;
};

type PlaceholderItem = {
  token: string;
  label: string;
  group: string;
};

type PlaceholderRelationTemplates = {
  parent: EntityTemplate;
  children: EntityTemplate[];
};

const { isOpen, context, closeMailDialog } = useSaplingMailDialog();
const { pushMessage } = useSaplingMessageCenter();
const { t, te } = useI18n();
const {
  translationService,
  isLoading: isTranslationLoading,
  loadTranslations,
} = useTranslationLoader(
  'global',
  'navigation',
  'document',
  'mail',
);

const templates = ref<EmailTemplateItem[]>([]);
const placeholders = ref<PlaceholderItem[]>([]);
const availableAttachments = ref<AttachmentOption[]>([]);
const templateHandle = ref<number | null>(null);
const attachmentHandles = ref<number[]>([]);
const toInput = ref('');
const ccInput = ref('');
const bccInput = ref('');
const subject = ref('');
const bodyMarkdown = ref('');
const insertTarget = ref<'subject' | 'body'>('body');
const previewHtml = ref('');
const previewSubject = ref('');
const previewTo = ref('');
const previewCc = ref('');
const previewBcc = ref('');
const isLoadingTemplates = ref(false);
const isLoadingPlaceholders = ref(false);
const isLoadingAttachments = ref(false);
const isPreviewLoading = ref(false);
const isSending = ref(false);

const entityLabel = computed(() => {
  const handle = context.value?.entityHandle;

  if (!handle) {
    return '';
  }

  return translateIfExists(`navigation.${handle}`, handle);
});

const dialogTitle = computed(() => {
  if (!context.value?.entityHandle) {
    return translate('mail.compose');
  }

  return translateWithParams('mail.composeForEntity', { entity: entityLabel.value });
});

const heroStats = computed(() => [
  { label: translate('mail.recipientsStat'), value: splitRecipients(toInput.value).length },
  { label: translate('mail.templatesStat'), value: templates.value.length },
  { label: translate('mail.attachmentsStat'), value: attachmentHandles.value.length },
]);

const placeholderGroups = computed(() => {
  const groups = new Map<string, PlaceholderItem[]>();

  for (const placeholder of placeholders.value) {
    const current = groups.get(placeholder.group) ?? [];
    current.push(placeholder);
    groups.set(placeholder.group, current);
  }

  return [...groups.entries()].map(([name, items]) => ({
    name,
    items,
  }));
});

const attachmentSelectionSummary = computed(() => {
  if (attachmentHandles.value.length === 0) {
    return '';
  }

  return availableAttachments.value
    .filter((attachment) => attachmentHandles.value.includes(attachment.handle))
    .map((attachment) => attachment.filename)
    .join(', ');
});

watch(isOpen, async (open) => {
  if (!open || !context.value) {
    resetState();
    return;
  }

  initializeFromContext();
  await loadTranslations();
  await Promise.all([
    loadTemplates(),
    loadAttachments(),
  ]);
  await loadPlaceholders();
  await refreshPreview();
}, { immediate: true });

function handleVisibilityChange(value: boolean) {
  if (!value) {
    closeMailDialog();
  }
}

function initializeFromContext() {
  toInput.value = (context.value?.initialTo ?? []).join('; ');
  ccInput.value = '';
  bccInput.value = '';
  subject.value = context.value?.initialSubject ?? '';
  bodyMarkdown.value = '';
  templateHandle.value = null;
  attachmentHandles.value = [];
  insertTarget.value = 'body';
}

function resetState() {
  templates.value = [];
  placeholders.value = [];
  availableAttachments.value = [];
  templateHandle.value = null;
  attachmentHandles.value = [];
  toInput.value = '';
  ccInput.value = '';
  bccInput.value = '';
  subject.value = '';
  bodyMarkdown.value = '';
  insertTarget.value = 'body';
  previewHtml.value = '';
  previewSubject.value = '';
  previewTo.value = '';
  previewCc.value = '';
  previewBcc.value = '';
  isLoadingTemplates.value = false;
  isLoadingPlaceholders.value = false;
  isLoadingAttachments.value = false;
  isPreviewLoading.value = false;
  isSending.value = false;
}

async function loadTemplates() {
  if (!context.value?.entityHandle) {
    return;
  }

  isLoadingTemplates.value = true;

  try {
    const response = await ApiGenericService.find<EmailTemplateItem>('emailTemplate', {
      filter: {
        entity: context.value.entityHandle,
        isActive: true,
      },
      orderBy: {
        name: 'ASC',
      },
      limit: 100,
      relations: ['entity'],
    }) as PaginatedResponse<EmailTemplateItem>;

    templates.value = response.data ?? [];
  } catch (error) {
    console.error('Error loading email templates:', error);
    pushMessage('warning', 'mail.templatesLoadFailed', 'mail.templatesLoadFailedDescription', 'mail');
    templates.value = [];
  } finally {
    isLoadingTemplates.value = false;
  }
}

async function applyTemplate() {
  const selectedTemplate = templates.value.find((template) => template.handle === templateHandle.value);
  if (selectedTemplate) {
    subject.value = selectedTemplate.subjectTemplate;
    bodyMarkdown.value = selectedTemplate.bodyMarkdown;
  }

  await refreshPreview();
}

async function loadPlaceholders() {
  if (!context.value?.entityHandle) {
    return;
  }

  isLoadingPlaceholders.value = true;

  try {
    const rootTemplates = await ApiMailService.getEntityTemplate(context.value.entityHandle);
    const relatedTemplates = await Promise.all(
      rootTemplates
        .filter(isSupportedPlaceholderRelation)
        .map(async (template) => ({
          parent: template,
          children: await ApiMailService.getEntityTemplate(template.referenceName ?? ''),
        })),
    );

    await loadPlaceholderTranslations(relatedTemplates);

    placeholders.value = buildPlaceholderItems(rootTemplates, relatedTemplates);
  } catch (error) {
    console.error('Error loading placeholders:', error);
    pushMessage('warning', 'mail.placeholdersLoadFailed', 'mail.placeholdersLoadFailedDescription', 'mail');
    placeholders.value = [];
  } finally {
    isLoadingPlaceholders.value = false;
  }
}

async function loadAttachments() {
  if (!context.value?.entityHandle || context.value.itemHandle == null) {
    availableAttachments.value = [];
    attachmentHandles.value = [];
    return;
  }

  isLoadingAttachments.value = true;

  try {
    const response = await ApiGenericService.find<AttachmentItem>('document', {
      filter: {
        reference: String(context.value.itemHandle),
        entity: context.value.entityHandle,
      },
      orderBy: {
        createdAt: 'DESC',
      },
      limit: 100,
    }) as PaginatedResponse<AttachmentItem>;

    availableAttachments.value = (response.data ?? []).map((document) => ({
      handle: document.handle,
      filename: document.filename,
      title: document.description
        ? `${document.filename} - ${document.description}`
        : `${document.filename} (${document.mimetype})`,
    }));
  } catch (error) {
    console.error('Error loading attachments:', error);
    pushMessage('warning', 'mail.attachmentsLoadFailed', 'mail.attachmentsLoadFailedDescription', 'mail');
    availableAttachments.value = [];
  } finally {
    isLoadingAttachments.value = false;
  }
}

async function refreshPreview() {
  if (!context.value?.entityHandle) {
    return;
  }

  isPreviewLoading.value = true;

  try {
    const preview = await ApiMailService.preview({
      entityHandle: context.value.entityHandle,
      itemHandle: context.value.itemHandle,
      templateHandle: templateHandle.value ?? undefined,
      subject: subject.value,
      bodyMarkdown: bodyMarkdown.value,
      to: splitRecipients(toInput.value),
      cc: splitRecipients(ccInput.value),
      bcc: splitRecipients(bccInput.value),
      draftValues: context.value.draftValues,
      attachmentHandles: attachmentHandles.value,
    });

    previewHtml.value = preview.bodyHtml;
    previewSubject.value = preview.subject;
    previewTo.value = preview.to.join(', ');
    previewCc.value = preview.cc.join(', ');
    previewBcc.value = preview.bcc.join(', ');
  } catch (error) {
    console.error('Error previewing email:', error);
    pushMessage('error', 'mail.previewFailed', 'mail.previewFailedDescription', 'mail');
  } finally {
    isPreviewLoading.value = false;
  }
}

async function sendMail() {
  if (!context.value?.entityHandle) {
    return;
  }

  isSending.value = true;

  try {
    await ApiMailService.send({
      entityHandle: context.value.entityHandle,
      itemHandle: context.value.itemHandle,
      templateHandle: templateHandle.value ?? undefined,
      subject: subject.value,
      bodyMarkdown: bodyMarkdown.value,
      to: splitRecipients(toInput.value),
      cc: splitRecipients(ccInput.value),
      bcc: splitRecipients(bccInput.value),
      draftValues: context.value.draftValues,
      attachmentHandles: attachmentHandles.value,
    });

    pushMessage('success', 'mail.sendQueued', 'mail.sendQueuedDescription', 'mail');
    closeMailDialog();
  } catch (error) {
    console.error('Error sending email:', error);
    pushMessage('error', 'mail.sendFailed', 'mail.sendFailedDescription', 'mail');
  } finally {
    isSending.value = false;
  }
}

function insertPlaceholder(token: string) {
  if (insertTarget.value === 'subject') {
    subject.value = appendToken(subject.value, token, ' ');
    return;
  }

  bodyMarkdown.value = appendToken(bodyMarkdown.value, token, '\n');
}

function appendToken(currentValue: string, token: string, separator: string): string {
  if (!currentValue) {
    return token;
  }

  const normalizedSeparator = currentValue.endsWith(separator) ? '' : separator;
  return `${currentValue}${normalizedSeparator}${token}`;
}

function buildPlaceholderItems(
  rootTemplates: EntityTemplate[],
  relationTemplates: PlaceholderRelationTemplates[],
): PlaceholderItem[] {
  const items: PlaceholderItem[] = [];
  const currentEntityHandle = context.value?.entityHandle ?? '';

  for (const template of rootTemplates.filter(isScalarPlaceholderTemplate)) {
    items.push({
      token: `{{${template.name}}}`,
      label: translateTemplateLabel(currentEntityHandle, template.name),
      group: entityLabel.value || translate('mail.placeholderGroupCurrent'),
    });
  }

  for (const relation of relationTemplates) {
    const relationEntityHandle = relation.parent.referenceName ?? '';

    for (const child of relation.children.filter(isScalarPlaceholderTemplate)) {
      items.push({
        token: `{{${relation.parent.name}.${child.name}}}`,
        label: translateTemplateLabel(relationEntityHandle, child.name),
        group: translateTemplateLabel(currentEntityHandle, relation.parent.name),
      });
    }
  }

  return items
    .filter((item, index, array) => array.findIndex((candidate) => candidate.token === item.token) === index)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function isScalarPlaceholderTemplate(template: EntityTemplate): boolean {
  return !template.isReference && template.isPersistent !== false;
}

function isSupportedPlaceholderRelation(template: EntityTemplate): boolean {
  return !!template.isReference && !!template.referenceName && template.kind !== '1:m';
}

async function loadPlaceholderTranslations(
  relationTemplates: PlaceholderRelationTemplates[],
) {
  const namespaces = new Set<string>();
  const currentEntityHandle = context.value?.entityHandle;

  if (currentEntityHandle) {
    namespaces.add(currentEntityHandle);
  }

  for (const relation of relationTemplates) {
    if (relation.parent.referenceName) {
      namespaces.add(relation.parent.referenceName);
    }
  }

  if (namespaces.size === 0) {
    return;
  }

  await translationService.value.prepare(...namespaces);
}

function splitRecipients(value: string): string[] {
  return value
    .split(/[;,]/)
    .map(entry => entry.trim())
    .filter(Boolean);
}

function translateTemplateLabel(entityHandle: string, property: string): string {
  if (!entityHandle) {
    return property;
  }

  return translateIfExists(`${entityHandle}.${property}`, property);
}

function translate(key: string): string {
  return isTranslationLoading.value ? '' : t(key);
}

function translateIfExists(key: string, fallback: string): string {
  if (isTranslationLoading.value) {
    return fallback;
  }

  return te(key) ? t(key) : fallback;
}

function translateWithParams(
  key: string,
  params: Record<string, unknown>,
): string {
  if (isTranslationLoading.value) {
    return '';
  }

  return te(key) ? t(key, params) : '';
}
</script>

<style scoped>
.sapling-mail-dialog {
  display: flex;
  flex-direction: column;
  height: var(--sapling-dialog-card-height);
  max-height: var(--sapling-dialog-card-height);
  overflow: hidden;
  border-radius: var(--sapling-file-panel-radius-compact);
}

.sapling-mail-dialog__shell,
.sapling-mail-dialog__content,
.sapling-mail-dialog__scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.sapling-mail-dialog__header {
  flex: 0 0 auto;
  padding: var(--sapling-space-panel-xl) var(--sapling-space-panel-xl) 0;
}

.sapling-mail-dialog__content {
  gap: var(--sapling-gap-lg);
  overflow: hidden;
  padding: var(--sapling-gap-xl) var(--sapling-space-panel-xl) 0;
}

.sapling-mail-dialog__scroll {
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.sapling-mail-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 1rem;
  align-items: start;
}

.sapling-mail-dialog__form {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.sapling-mail-dialog__helper-card-text {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.sapling-mail-dialog__helper-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sapling-mail-dialog__helper-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.sapling-mail-dialog__placeholder-groups {
  display: grid;
  gap: 0.75rem;
  max-height: min(22vh, 210px);
  overflow-y: auto;
  padding-right: 0.35rem;
}

.sapling-mail-dialog__placeholder-group {
  display: grid;
  gap: 0.4rem;
}

.sapling-mail-dialog__placeholder-group-title {
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.75;
}

.sapling-mail-dialog__placeholder-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.sapling-mail-dialog__placeholder-chip {
  cursor: pointer;
}

.sapling-mail-dialog__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.sapling-mail-dialog__attachment-summary {
  font-size: 0.85rem;
  opacity: 0.78;
  word-break: break-word;
}

.sapling-mail-dialog__preview-shell {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.sapling-mail-dialog__preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sapling-mail-dialog__preview-title {
  font-size: 1rem;
  font-weight: 600;
}

.sapling-mail-dialog__preview-card {
  min-height: 100%;
  overflow: hidden;
}

.sapling-mail-dialog__preview-meta {
  display: grid;
  gap: 0.35rem;
  word-break: break-word;
}

.sapling-mail-dialog__preview-html :deep(p:first-child) {
  margin-top: 0;
}

.sapling-mail-dialog__preview-html {
  overflow-wrap: anywhere;
}

.sapling-mail-dialog__footer {
  flex: 0 0 auto;
  padding: var(--sapling-gap-xl) var(--sapling-space-panel-xl) var(--sapling-space-panel-xl);
  border-top: 1px solid var(--sapling-surface-border-muted);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.12));
}

.sapling-mail-dialog__footer :deep(.v-card-actions) {
  padding: 0;
}

@media (max-width: 960px) {
  .sapling-mail-dialog__header {
    padding: var(--sapling-space-panel-md) var(--sapling-space-panel-md) 0;
  }

  .sapling-mail-dialog__content {
    padding: var(--sapling-gap-md) var(--sapling-space-panel-md) 0;
  }

  .sapling-mail-dialog__footer {
    padding: var(--sapling-gap-md) var(--sapling-space-panel-md) var(--sapling-space-panel-md);
  }

  .sapling-mail-dialog__grid {
    grid-template-columns: 1fr;
  }

  .sapling-mail-dialog__meta-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .sapling-mail-dialog {
    height: 94vh;
    max-height: 94vh;
  }
}
</style>