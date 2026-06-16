import type { EntityTemplateFormWidth, SaplingFormRenderer } from '@/entity/structure'

export type PreviewMode = 'form' | 'table' | 'mobile'

export interface FieldDraft {
  name: string
  type: string
  visible: boolean
  label: string
  group: string
  order: number | null
  width: EntityTemplateFormWidth
  tableVisible: boolean
  tableOrder: number | null
  mobileVisible: boolean
  mobileOrder: number | null
  renderer: SaplingFormRenderer
  placeholder: string
  required: boolean
  readonly: boolean
}

export interface StaticOption<T> {
  title: string
  value: T
}
