<template>
  <div class="sapling-file-preview sapling-file-mail sapling-file-preview-fullheight">
    <div v-if="isLoading" class="sapling-file-mail-state d-flex align-center justify-center">
      <v-progress-circular color="primary" indeterminate size="28" width="3" />
    </div>

    <div v-else-if="errorMessage" class="sapling-file-mail-state d-flex align-center justify-center">
      <v-alert density="comfortable" type="warning" variant="tonal">
        {{ errorMessage }}
      </v-alert>
    </div>

    <div v-else class="sapling-file-mail-layout">
      <div class="sapling-file-mail-summary">
        <div class="sapling-file-mail-title-row">
          <div>
            <div class="sapling-file-mail-label">{{ getLabel('Betreff', 'Subject') }}</div>
            <div class="sapling-file-mail-subject">{{ mailPreview.subject || fallbackSubject }}</div>
          </div>
          <v-chip color="primary" size="small" variant="tonal">EML</v-chip>
        </div>

        <div class="sapling-file-mail-meta-grid">
          <div v-for="entry in metadataEntries" :key="entry.label" class="sapling-file-mail-meta-item">
            <div class="sapling-file-mail-label">{{ entry.label }}</div>
            <div class="sapling-file-mail-value">{{ entry.value }}</div>
          </div>
        </div>

        <div v-if="mailPreview.attachments.length" class="sapling-file-mail-attachments">
          <div class="sapling-file-mail-label">{{ getLabel('Anhänge', 'Attachments') }}</div>
          <div class="sapling-file-mail-chip-list">
            <v-chip
              v-for="attachment in mailPreview.attachments"
              :key="attachment"
              size="small"
              variant="outlined"
            >
              {{ attachment }}
            </v-chip>
          </div>
        </div>
      </div>

      <div class="sapling-file-mail-body">
        <div class="sapling-file-mail-label">{{ getLabel('Inhalt', 'Content') }}</div>
        <iframe
          v-if="htmlPreviewDoc"
          :srcdoc="htmlPreviewDoc"
          class="sapling-file-mail-iframe"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          title="Mail preview"
        />
        <pre v-else class="sapling-file-mail-text">{{ mailPreview.bodyText || getLabel('Kein lesbarer Nachrichteninhalt vorhanden.', 'No readable message content available.') }}</pre>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import DOMPurify from 'dompurify';
import PostalMime, { type Address, type Email } from 'postal-mime';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

type MailPreviewData = {
  subject: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  date: string;
  bodyHtml: string;
  bodyText: string;
  attachments: string[];
};

const props = defineProps<{
  mailUrl: string;
  fileName?: string;
}>();

const { locale } = useI18n();

const isLoading = ref(false);
const errorMessage = ref('');
let requestToken = 0;
const mailPreview = ref<MailPreviewData>({
  subject: '',
  from: '',
  to: '',
  cc: '',
  bcc: '',
  date: '',
  bodyHtml: '',
  bodyText: '',
  attachments: [],
});

const fallbackSubject = computed(() => props.fileName || getLabel('Unbenannte Nachricht', 'Untitled message'));

const metadataEntries = computed(() => {
  const entries = [
    { label: getLabel('Von', 'From'), value: mailPreview.value.from },
    { label: getLabel('An', 'To'), value: mailPreview.value.to },
    { label: getLabel('CC', 'CC'), value: mailPreview.value.cc },
    { label: getLabel('BCC', 'BCC'), value: mailPreview.value.bcc },
    { label: getLabel('Datum', 'Date'), value: mailPreview.value.date },
  ];

  return entries.filter((entry) => entry.value);
});

const htmlPreviewDoc = computed(() => {
  if (!mailPreview.value.bodyHtml) {
    return '';
  }

  return buildHtmlPreviewDocument(mailPreview.value.bodyHtml);
});

watch(
  () => props.mailUrl,
  () => {
    void loadPreview();
  },
  { immediate: true },
);

function getLabel(german: string, english: string) {
  return String(locale.value || 'de').toLowerCase().startsWith('de') ? german : english;
}

function resetPreview() {
  errorMessage.value = '';
  mailPreview.value = {
    subject: '',
    from: '',
    to: '',
    cc: '',
    bcc: '',
    date: '',
    bodyHtml: '',
    bodyText: '',
    attachments: [],
  };
}

async function loadPreview() {
  const currentToken = ++requestToken;

  if (!props.mailUrl) {
    resetPreview();
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch(props.mailUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const nextPreview = await parseEml(buffer);

    if (currentToken !== requestToken) {
      return;
    }

    mailPreview.value = nextPreview;
  } catch {
    if (currentToken !== requestToken) {
      return;
    }

    resetPreview();
    errorMessage.value = getLabel(
      'Die Mail-Vorschau konnte nicht geladen werden.',
      'The mail preview could not be loaded.',
    );
  } finally {
    if (currentToken === requestToken) {
      isLoading.value = false;
    }
  }
}

async function parseEml(buffer: ArrayBuffer): Promise<MailPreviewData> {
  const email = await PostalMime.parse(buffer, {
    attachmentEncoding: 'arraybuffer',
  });

  return {
    subject: email.subject || '',
    from: formatSingleAddress(email.from),
    to: formatAddressList(email.to),
    cc: formatAddressList(email.cc),
    bcc: formatAddressList(email.bcc),
    date: formatDateValue(email.date),
    bodyHtml: sanitizeHtml(email.html || ''),
    bodyText: normalizeBodyText(email.text || ''),
    attachments: email.attachments.map(getAttachmentLabel).filter(Boolean),
  };
}

function formatSingleAddress(address?: Address): string {
  if (!address) {
    return '';
  }

  if ('group' in address && Array.isArray(address.group)) {
    return address.group.map(formatMailbox).filter(Boolean).join(', ');
  }

  return formatMailbox(address);
}

function formatAddressList(addresses?: Address[]): string {
  if (!addresses?.length) {
    return '';
  }

  return addresses
    .map(formatSingleAddress)
    .filter(Boolean)
    .join(', ');
}

function formatMailbox(address: { name: string; address?: string }): string {
  if (!address.address) {
    return address.name || '';
  }

  return address.name ? `${address.name} <${address.address}>` : address.address;
}

function formatDateValue(value?: string): string {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(String(locale.value || 'de'), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}

function sanitizeHtml(value: string): string {
  if (!value) {
    return '';
  }

  return DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script'],
  });
}

function normalizeBodyText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function getAttachmentLabel(attachment: Email['attachments'][number]): string {
  return attachment.filename || attachment.description || getLabel('Unbenannter Anhang', 'Unnamed attachment');
}

function buildHtmlPreviewDocument(content: string): string {
  return `<!DOCTYPE html>
<html lang="${String(locale.value || 'de')}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: cid:; style-src 'unsafe-inline'; font-src data:;">
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 16px;
        color: #1f2937;
        font: 400 14px/1.55 'Segoe UI', sans-serif;
        background: #ffffff;
        word-break: break-word;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      table {
        max-width: 100%;
        border-collapse: collapse;
      }

      pre {
        white-space: pre-wrap;
      }

      blockquote {
        margin: 0;
        padding-left: 12px;
        border-left: 3px solid #d1d5db;
        color: #4b5563;
      }

      a {
        color: #0f766e;
      }
    </style>
  </head>
  <body>${content}</body>
</html>`;
}
</script>

<style scoped>
.sapling-file-mail {
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sapling-file-preview-fullheight {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  display: flex;
}

.sapling-file-mail-layout {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
}

.sapling-file-mail-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
}

.sapling-file-mail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.sapling-file-mail-subject {
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.sapling-file-mail-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.sapling-file-mail-meta-item {
  min-width: 0;
}

.sapling-file-mail-label {
  margin-bottom: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sapling-file-mail-value {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgb(var(--v-theme-on-surface));
}

.sapling-file-mail-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sapling-file-mail-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sapling-file-mail-body {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
}

.sapling-file-mail-iframe {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  border: 0;
  border-radius: 12px;
}

.sapling-file-mail-text {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border-radius: 12px;
  color: rgb(var(--v-theme-on-surface));
  font: 400 0.95rem/1.6 'Segoe UI', sans-serif;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.sapling-file-mail-state {
  flex: 1 1 auto;
  min-height: 0;
}

@media (max-width: 960px) {
  .sapling-file-mail-layout {
    gap: 12px;
  }

  .sapling-file-mail-summary,
  .sapling-file-mail-body {
    padding: 12px;
    border-radius: 12px;
  }

  .sapling-file-mail-title-row {
    flex-direction: column;
  }
}
</style>