import markdownItTaskLists from 'markdown-it-task-lists'

export const SAPLING_MARKDOWN_OPTIONS = Object.freeze({
  breaks: true,
  linkify: true,
})

export const SAPLING_MARKDOWN_PLUGINS = [markdownItTaskLists]

export function normalizeMarkdownContent(value?: string | null): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
}
