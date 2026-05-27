import { describe, expect, it } from 'vitest'
import { buildCsv, buildCsvTemplate, parseCsv } from '@/utils/saplingCsvUtil'
import type { EntityTemplate } from '@/entity/structure'

describe('saplingCsvUtil', () => {
  it('builds an Excel-friendly CSV template from importable fields', () => {
    const csv = buildCsvTemplate([
      createTemplate({ name: 'handle', isAutoIncrement: true }),
      createTemplate({ name: 'title' }),
      createTemplate({ name: 'status', kind: 'm:1', isReference: true }),
      createTemplate({ name: 'notes', options: ['isReadOnly'] }),
    ])

    expect(csv).toBe('\uFEFFhandle;title;status\r\n')
  })

  it('serializes current rows and collapses references to their handle', () => {
    const csv = buildCsv(
      [
        {
          handle: 7,
          title: 'Planning; kickoff',
          status: { handle: 'open', title: 'Open' },
        },
      ],
      [createTemplate({ name: 'title' }), createTemplate({ name: 'status', kind: 'm:1' })],
    )

    expect(csv).toBe('\uFEFFhandle;title;status\r\n7;"Planning; kickoff";open\r\n')
  })

  it('adds the handle header even when metadata does not contain it', () => {
    const csv = buildCsv(
      [{ handle: 9, title: 'Imported later' }],
      [createTemplate({ name: 'title' })],
    )

    expect(csv).toBe('\uFEFFhandle;title\r\n9;Imported later\r\n')
  })

  it('parses semicolon CSV rows with quoted cells', () => {
    const rows = parseCsv('title;status\r\n"Planning; kickoff";open\r\n')

    expect(rows).toEqual([
      {
        title: 'Planning; kickoff',
        status: 'open',
      },
    ])
  })
})

function createTemplate(overrides: Partial<EntityTemplate> & { name: string }): EntityTemplate {
  return {
    key: overrides.name,
    name: overrides.name,
    type: overrides.type ?? 'string',
    isPersistent: overrides.isPersistent ?? true,
    isAutoIncrement: overrides.isAutoIncrement ?? false,
    isReference: overrides.isReference ?? false,
    kind: overrides.kind,
    options: overrides.options ?? [],
  } as EntityTemplate
}
