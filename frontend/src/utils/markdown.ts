import markdownItTaskLists from 'markdown-it-task-lists'
import { BACKEND_URL } from '@/constants/project.constants'

export const SAPLING_MARKDOWN_OPTIONS = Object.freeze({
  breaks: true,
  linkify: true,
})

export const SAPLING_MARKDOWN_PLUGINS = [markdownItTaskLists, saplingDocumentMarkdownPlugin]

export function normalizeMarkdownContent(value?: string | null): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
}

type SaplingDocumentEmbedKind = 'document' | 'image' | 'audio' | 'video'

interface SaplingDocumentEmbedMeta {
  handle: string
  kind: SaplingDocumentEmbedKind
  label: string
}

interface MarkdownTokenLike {
  attrGet?: (name: string) => string | null
  attrSet?: (name: string, value: string) => void
  content?: string
  meta?: unknown
}

interface MarkdownInlineStateLike {
  pos: number
  posMax: number
  src: string
  push: (type: string, tag: string, nesting: number) => MarkdownTokenLike
}

interface MarkdownParserLike {
  inline: {
    ruler: {
      before: (
        beforeName: string,
        ruleName: string,
        rule: (state: MarkdownInlineStateLike, silent: boolean) => boolean,
      ) => void
    }
  }
  renderer: {
    rules: Record<string, unknown>
    renderToken?: (
      tokens: MarkdownTokenLike[],
      index: number,
      options: unknown,
      env: unknown,
      self: unknown,
    ) => string
  }
}

const SAPLING_DOCUMENT_INLINE_RE =
  /^\{\{sapling-(document|image|audio|video):(\d+)(?:\|([^}\n]+))?\}\}/
const SAPLING_DOCUMENT_URL_RE = /^sapling-document:(\d+)$/

function saplingDocumentMarkdownPlugin(markdown: MarkdownParserLike): void {
  markdown.inline.ruler.before('emphasis', 'sapling_document_embed', parseSaplingDocumentEmbed)

  markdown.renderer.rules.sapling_document_embed = (
    tokens: MarkdownTokenLike[],
    index: number,
  ) => renderSaplingDocumentEmbed(tokens[index]?.meta)

  const defaultLinkOpenRule = markdown.renderer.rules.link_open
  markdown.renderer.rules.link_open = (
    tokens: MarkdownTokenLike[],
    index: number,
    options: unknown,
    env: unknown,
    self: unknown,
  ) => {
    rewriteSaplingDocumentUrl(tokens[index], 'href')
    return typeof defaultLinkOpenRule === 'function'
      ? defaultLinkOpenRule(tokens, index, options, env, self)
      : renderMarkdownToken(markdown, tokens, index, options, env, self)
  }

  const defaultImageRule = markdown.renderer.rules.image
  markdown.renderer.rules.image = (
    tokens: MarkdownTokenLike[],
    index: number,
    options: unknown,
    env: unknown,
    self: unknown,
  ) => {
    rewriteSaplingDocumentUrl(tokens[index], 'src')
    return typeof defaultImageRule === 'function'
      ? defaultImageRule(tokens, index, options, env, self)
      : renderMarkdownToken(markdown, tokens, index, options, env, self)
  }
}

function parseSaplingDocumentEmbed(state: MarkdownInlineStateLike, silent: boolean): boolean {
  if (state.pos >= state.posMax || state.src.charCodeAt(state.pos) !== 0x7b) {
    return false
  }

  const match = state.src.slice(state.pos).match(SAPLING_DOCUMENT_INLINE_RE)
  if (!match) {
    return false
  }

  if (!silent) {
    const token = state.push('sapling_document_embed', '', 0)
    token.meta = {
      handle: match[2],
      kind: match[1] as SaplingDocumentEmbedKind,
      label: (match[3] ?? '').trim(),
    } satisfies SaplingDocumentEmbedMeta
  }

  state.pos += match[0].length
  return true
}

function renderSaplingDocumentEmbed(meta: unknown): string {
  if (!isSaplingDocumentEmbedMeta(meta)) {
    return ''
  }

  const label = meta.label || `Dokument ${meta.handle}`
  const downloadUrl = getSaplingDocumentDownloadUrl(meta.handle)
  const previewUrl = getSaplingDocumentPreviewUrl(meta.handle)

  if (meta.kind === 'image') {
    return [
      '<figure class="sapling-markdown-document sapling-markdown-document--image">',
      `<img src="${escapeAttribute(downloadUrl)}" alt="${escapeAttribute(label)}" loading="lazy" />`,
      meta.label ? `<figcaption>${escapeHtml(meta.label)}</figcaption>` : '',
      '</figure>',
    ].join('')
  }

  if (meta.kind === 'audio') {
    return [
      '<figure class="sapling-markdown-document sapling-markdown-document--audio">',
      `<audio controls preload="metadata" src="${escapeAttribute(downloadUrl)}"></audio>`,
      `<figcaption>${escapeHtml(label)}</figcaption>`,
      '</figure>',
    ].join('')
  }

  if (meta.kind === 'video') {
    return [
      '<figure class="sapling-markdown-document sapling-markdown-document--video">',
      `<video controls preload="metadata" src="${escapeAttribute(downloadUrl)}"></video>`,
      `<figcaption>${escapeHtml(label)}</figcaption>`,
      '</figure>',
    ].join('')
  }

  return [
    '<a class="sapling-markdown-document-link" ',
    `href="${escapeAttribute(previewUrl)}" target="_blank" rel="noopener noreferrer">`,
    `${escapeHtml(label)}</a>`,
  ].join('')
}

function rewriteSaplingDocumentUrl(token: MarkdownTokenLike | undefined, attributeName: string): void {
  const value = token?.attrGet?.(attributeName)
  const handle = value?.match(SAPLING_DOCUMENT_URL_RE)?.[1]
  if (!handle) {
    return
  }

  token?.attrSet?.(attributeName, getSaplingDocumentDownloadUrl(handle))

  if (attributeName === 'href') {
    token?.attrSet?.('target', '_blank')
    token?.attrSet?.('rel', 'noopener noreferrer')
  }
}

function renderMarkdownToken(
  markdown: MarkdownParserLike,
  tokens: MarkdownTokenLike[],
  index: number,
  options: unknown,
  env: unknown,
  self: unknown,
): string {
  return markdown.renderer.renderToken?.(tokens, index, options, env, self) ?? ''
}

function isSaplingDocumentEmbedMeta(value: unknown): value is SaplingDocumentEmbedMeta {
  return (
    typeof value === 'object' &&
    value !== null &&
    'handle' in value &&
    'kind' in value &&
    typeof (value as SaplingDocumentEmbedMeta).handle === 'string' &&
    ['document', 'image', 'audio', 'video'].includes(
      (value as SaplingDocumentEmbedMeta).kind,
    )
  )
}

function getSaplingDocumentDownloadUrl(handle: string): string {
  return `${BACKEND_URL}document/download/${encodeURIComponent(handle)}`
}

function getSaplingDocumentPreviewUrl(handle: string): string {
  return `${BACKEND_URL}document/preview/${encodeURIComponent(handle)}`
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
