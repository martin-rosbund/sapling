import type { EntityTemplate } from '@/entity/structure'

export type EmailTemplateItem = {
  handle: number
  name: string
  subjectTemplate: string
  bodyMarkdown: string
}

export type AttachmentOption = {
  handle: number
  title: string
  filename: string
}

export type PlaceholderItem = {
  token: string
  label: string
  group: string
}

export type PlaceholderGroup = {
  name: string
  items: PlaceholderItem[]
}

export type InsertTarget = 'subject' | 'body'

export type PlaceholderRelationTemplates = {
  parent: EntityTemplate
  children: EntityTemplate[]
}
