import { describe, expect, it, vi } from 'vitest'

import type { KPIItem } from '@/entity/entity'
import type { KpiDrilldown, KpiDrilldownEntry } from '@/entity/structure'

import {
  buildKpiDrilldownPath,
  buildKpiEntityFilter,
  buildKpiEntityPath,
  getKpiTargetEntityHandle,
  navigateToKpiDrilldown,
  navigateToKpiEntity,
} from '../saplingKpiNavigation'

function createKpi(overrides: Partial<KPIItem> = {}): KPIItem {
  return {
    handle: 1,
    name: 'Revenue',
    aggregation: {} as KPIItem['aggregation'],
    field: 'amount',
    type: 'sum',
    createdAt: null,
    ...overrides,
  }
}

describe('saplingKpiNavigation', () => {
  it('resolves the target entity handle from strings and entity objects', () => {
    expect(getKpiTargetEntityHandle('ticket')).toBe('ticket')
    expect(getKpiTargetEntityHandle({ handle: 'invoice' } as KPIItem['targetEntity'])).toBe(
      'invoice',
    )
    expect(getKpiTargetEntityHandle(null)).toBeNull()
  })

  it('merges a base filter with grouped row values', () => {
    const kpi = createKpi({
      filter: '{"status":"open"}' as unknown as KPIItem['filter'],
      groupBy: ['company.handle', 'priority'],
    })

    expect(buildKpiEntityFilter(kpi, { handle: 'acme', priority: 'high', ignored: true })).toEqual({
      $and: [{ status: 'open' }, { 'company.handle': 'acme', priority: 'high' }],
    })
  })

  it('builds entity paths with an encoded filter query', () => {
    const path = buildKpiEntityPath(
      createKpi({
        targetEntity: 'ticket',
        filter: { status: 'open' },
        groupBy: ['priority'],
      }),
      { priority: 'high' },
    )

    expect(path).toMatch(/^\/table\/ticket\?filter=/)

    const url = new URL(path ?? '', 'http://localhost')
    expect(JSON.parse(url.searchParams.get('filter') ?? '{}')).toEqual({
      $and: [{ status: 'open' }, { priority: 'high' }],
    })
  })

  it('prefers drilldown entry filters when building drilldown paths', () => {
    const drilldown: KpiDrilldown = {
      entityHandle: 'task',
      baseFilter: { status: 'open' },
    }
    const entry: KpiDrilldownEntry = {
      key: 'today',
      label: 'Today',
      filter: { dueDate: '2026-04-16' },
    }

    const path = buildKpiDrilldownPath(createKpi({ targetEntity: 'ticket' }), drilldown, entry)
    const url = new URL(path ?? '', 'http://localhost')

    expect(url.pathname).toBe('/table/task')
    expect(JSON.parse(url.searchParams.get('filter') ?? '{}')).toEqual({ dueDate: '2026-04-16' })
  })

  it('navigates via the provided callback for entity and drilldown paths', () => {
    const navigate = vi.fn()
    const kpi = createKpi({ targetEntity: 'ticket', filter: { status: 'open' } })

    navigateToKpiEntity(kpi, undefined, navigate)
    navigateToKpiDrilldown(
      kpi,
      { entityHandle: 'task', baseFilter: { status: 'open' } },
      undefined,
      navigate,
    )

    expect(navigate).toHaveBeenNthCalledWith(
      1,
      '/table/ticket?filter=%7B%22status%22%3A%22open%22%7D',
    )
    expect(navigate).toHaveBeenNthCalledWith(
      2,
      '/table/task?filter=%7B%22status%22%3A%22open%22%7D',
    )
  })

  it('skips navigation when no entity handle can be resolved', () => {
    const navigate = vi.fn()

    navigateToKpiEntity(createKpi({ targetEntity: null }), undefined, navigate)

    expect(navigate).not.toHaveBeenCalled()
  })
})
