import { describe, expect, it } from 'vitest'

import type { EntityTemplate } from '@/entity/structure'

import {
  getDialogTemplateColumns,
  getDialogTemplateOrder,
  getDialogTemplateWidth,
  groupDialogTemplates,
  sortDialogTemplates,
} from '../saplingDialogLayoutUtil'

function createTemplate(overrides: Partial<EntityTemplate> = {}): EntityTemplate {
  const name = overrides.name ?? overrides.key ?? 'title'

  return {
    key: overrides.key ?? name,
    name,
    type: overrides.type ?? 'StringType',
    ...overrides,
  }
}

describe('saplingDialogLayoutUtil', () => {
  it('sorts templates by form order and preserves declaration order as fallback', () => {
    const templates = [
      createTemplate({ name: 'third' }),
      createTemplate({ name: 'first', formOrder: 1 }),
      createTemplate({ name: 'second', formOrder: 2 }),
    ]

    expect(sortDialogTemplates(templates).map((template) => template.name)).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('groups already sorted templates by form group', () => {
    const templates = sortDialogTemplates([
      createTemplate({ name: 'title', formOrder: 1, formGroup: 'general' }),
      createTemplate({ name: 'summary', formOrder: 2, formGroup: 'general' }),
      createTemplate({ name: 'notes', formOrder: 3, formGroup: 'details' }),
      createTemplate({ name: 'isActive', formOrder: 4 }),
    ])

    expect(groupDialogTemplates(templates, (groupKey) => `translated:${groupKey}`)).toEqual([
      {
        id: 'general',
        key: 'general',
        label: 'translated:general',
        templates: [
          expect.objectContaining({ name: 'title' }),
          expect.objectContaining({ name: 'summary' }),
        ],
      },
      {
        id: 'details',
        key: 'details',
        label: 'translated:details',
        templates: [expect.objectContaining({ name: 'notes' })],
      },
      {
        id: '__default__',
        key: null,
        label: null,
        templates: [expect.objectContaining({ name: 'isActive' })],
      },
    ])
  })

  it('sorts groups by explicit group order before declaration order', () => {
    const templates = sortDialogTemplates([
      createTemplate({
        name: 'supportQueue',
        formOrder: 1,
        formGroup: 'support',
        formGroupOrder: 60,
      }),
      createTemplate({
        name: 'title',
        formOrder: 2,
        formGroup: 'basics',
        formGroupOrder: 10,
      }),
      createTemplate({
        name: 'problemDescription',
        formOrder: 3,
        formGroup: 'content',
        formGroupOrder: 20,
      }),
      createTemplate({ name: 'createdAt', formOrder: 4 }),
    ])

    expect(groupDialogTemplates(templates).map((group) => group.id)).toEqual([
      'basics',
      'content',
      'support',
      '__default__',
    ])
  })

  it('maps dialog widths responsively and keeps sensible defaults', () => {
    expect(getDialogTemplateWidth(createTemplate({ formWidth: 1 }))).toBe(1)
    expect(getDialogTemplateColumns(createTemplate({ formWidth: 1 }))).toEqual({
      cols: 12,
      sm: 12,
      md: 6,
      lg: 3,
    })

    expect(getDialogTemplateColumns(createTemplate({ formWidth: 2 }))).toEqual({
      cols: 12,
      sm: 12,
      md: 6,
      lg: 6,
    })

    expect(getDialogTemplateColumns(createTemplate({ formWidth: 3 }))).toEqual({
      cols: 12,
      sm: 12,
      md: 12,
      lg: 9,
    })

    expect(getDialogTemplateColumns(createTemplate({ formWidth: 4 }))).toEqual({
      cols: 12,
      sm: 12,
      md: 12,
      lg: 12,
    })

    expect(getDialogTemplateWidth(createTemplate({ type: 'Boolean' }))).toBe(1)
    expect(getDialogTemplateWidth(createTemplate({ options: ['isMarkdown'] }))).toBe(4)
    expect(getDialogTemplateWidth(createTemplate({ length: 512 }))).toBe(4)
  })

  it('normalizes invalid order and width values gracefully', () => {
    expect(getDialogTemplateOrder(createTemplate({ formOrder: Number.NaN }), 5)).toBe(5)
    expect(getDialogTemplateWidth(createTemplate({ formWidth: 99 as never }))).toBe(4)
  })
})
