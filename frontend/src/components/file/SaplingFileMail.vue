<template>
  <div
    class="sapling-file-preview sapling-file-mail sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div v-if="isLoading" class="sapling-file-mail-layout">
      <div class="sapling-file-mail-summary sapling-file-panel">
        <v-skeleton-loader class="sapling-file-mail-loading-summary" type="heading, text, text" />
      </div>

      <div class="sapling-file-mail-body sapling-file-panel">
        <v-skeleton-loader class="sapling-file-mail-loading-body" type="article" />
      </div>
    </div>

    <div
      v-else-if="errorMessage"
      class="sapling-file-mail-state d-flex align-center justify-center"
    >
      <v-alert density="comfortable" type="warning" variant="tonal">
        {{ errorMessage }}
      </v-alert>
    </div>

    <div v-else class="sapling-file-mail-layout">
      <div class="sapling-file-mail-summary sapling-file-panel">
        <div class="sapling-file-mail-title-row">
          <div>
            <div class="sapling-file-mail-label">{{ $t('document.subject') }}</div>
            <div class="sapling-file-mail-subject">
              {{ mailPreview.subject || fallbackSubject }}
            </div>
          </div>
          <v-chip color="primary" size="small" variant="tonal">EML</v-chip>
        </div>

        <div class="sapling-file-mail-meta-grid">
          <div
            v-for="entry in metadataEntries"
            :key="entry.label"
            class="sapling-file-mail-meta-item"
          >
            <div class="sapling-file-mail-label">{{ entry.label }}</div>
            <div class="sapling-file-mail-value">{{ entry.value }}</div>
          </div>
        </div>

        <div v-if="mailPreview.attachments.length" class="sapling-file-mail-attachments">
          <div class="sapling-file-mail-label">{{ $t('document.attachments') }}</div>
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

      <div class="sapling-file-mail-body sapling-file-panel">
        <div class="sapling-file-mail-label">{{ $t('document.content') }}</div>
        <iframe
          v-if="htmlPreviewDoc"
          :srcdoc="htmlPreviewDoc"
          class="sapling-file-mail-iframe"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          title="Mail preview"
        />
        <pre v-else class="sapling-file-mail-text">{{
          mailPreview.bodyText || $t('document.noReadableContent')
        }}</pre>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import DOMPurify from 'dompurify'
import PostalMime, { type Address, type Email } from 'postal-mime'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { i18n } from '@/i18n'

type MailPreviewData = {
  subject: string
  from: string
  to: string
  cc: string
  bcc: string
  date: string
  bodyHtml: string
  bodyText: string
  attachments: string[]
}

const props = defineProps<{
  mailUrl: string
  fileName?: string
}>()

const { locale } = useI18n()

const isLoading = ref(false)
const errorMessage = ref('')
let requestToken = 0
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
})

const fallbackSubject = computed(() => props.fileName || i18n.global.t(`document.untitledMessage`))

const metadataEntries = computed(() => {
  const entries = [
    { label: i18n.global.t('document.from'), value: mailPreview.value.from },
    { label: i18n.global.t('document.to'), value: mailPreview.value.to },
    { label: i18n.global.t('document.cc'), value: mailPreview.value.cc },
    { label: i18n.global.t('document.bcc'), value: mailPreview.value.bcc },
    { label: i18n.global.t('document.date'), value: mailPreview.value.date },
  ]

  return entries.filter((entry) => entry.value)
})

const htmlPreviewDoc = computed(() => {
  if (!mailPreview.value.bodyHtml) {
    return ''
  }

  return buildHtmlPreviewDocument(mailPreview.value.bodyHtml)
})

watch(
  () => props.mailUrl,
  () => {
    void loadPreview()
  },
  { immediate: true },
)

function resetPreview() {
  errorMessage.value = ''
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
  }
}

async function loadPreview() {
  const currentToken = ++requestToken

  if (!props.mailUrl) {
    resetPreview()
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(props.mailUrl)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const nextPreview = await parseEml(buffer)

    if (currentToken !== requestToken) {
      return
    }

    mailPreview.value = nextPreview
  } catch {
    if (currentToken !== requestToken) {
      return
    }

    resetPreview()
    errorMessage.value = i18n.global.t('document.noPreviewAvailable')
  } finally {
    if (currentToken === requestToken) {
      isLoading.value = false
    }
  }
}

async function parseEml(buffer: ArrayBuffer): Promise<MailPreviewData> {
  const email = await PostalMime.parse(buffer, {
    attachmentEncoding: 'arraybuffer',
  })

  // Map Content-ID zu data-URL für Inline-Anhänge
  const cidMap: Record<string, string> = {}
  for (const att of email.attachments) {
    if (att.contentId && att.content) {
      const mime = att.mimeType || 'application/octet-stream'
      const base64 = arrayBufferToBase64(att.content as ArrayBuffer)
      cidMap[att.contentId.replace(/[<>]/g, '')] = `data:${mime};base64,${base64}`
    }
  }

  // Ersetze <img src="cid:..."> durch data-URLs
  let html = email.html || ''
  html = html.replace(/<img([^>]+)src=["']cid:([^"'>]+)["']/gi, (match, pre, cid) => {
    const dataUrl = cidMap[cid] || `cid:${cid}`
    return `<img${pre}src="${dataUrl}"`
  })

  return {
    subject: email.subject || '',
    from: formatSingleAddress(email.from),
    to: formatAddressList(email.to),
    cc: formatAddressList(email.cc),
    bcc: formatAddressList(email.bcc),
    date: formatDateValue(email.date),
    bodyHtml: sanitizeHtml(html),
    bodyText: normalizeBodyText(email.text || ''),
    attachments: email.attachments.map(getAttachmentLabel).filter(Boolean),
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function formatSingleAddress(address?: Address): string {
  if (!address) {
    return ''
  }

  if ('group' in address && Array.isArray(address.group)) {
    return address.group.map(formatMailbox).filter(Boolean).join(', ')
  }

  return formatMailbox(address)
}

function formatAddressList(addresses?: Address[]): string {
  if (!addresses?.length) {
    return ''
  }

  return addresses.map(formatSingleAddress).filter(Boolean).join(', ')
}

function formatMailbox(address: { name: string; address?: string }): string {
  if (!address.address) {
    return address.name || ''
  }

  return address.name ? `${address.name} <${address.address}>` : address.address
}

function formatDateValue(value?: string): string {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(String(locale.value || 'de'), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function sanitizeHtml(value: string): string {
  if (!value) {
    return ''
  }

  return DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script'],
  })
}

function normalizeBodyText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

function getAttachmentLabel(attachment: Email['attachments'][number]): string {
  return (
    attachment.filename || attachment.description || i18n.global.t('document.unnamedAttachment')
  )
}

function buildHtmlPreviewDocument(content: string): string {
  return `<!DOCTYPE html>
<html lang="${String(locale.value || 'de')}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: cid: https:; style-src 'unsafe-inline'; font-src data:;">
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
        background: transparent;
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
</html>`
}
</script>

<style scoped src="@/assets/styles/SaplingFileMail.css"></style>
