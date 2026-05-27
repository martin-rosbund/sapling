import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ColumnFilterItem, EntityTemplate } from '@/entity/structure'

const { apiFindMock, loadGenericMock, routeState } = vi.hoisted(() => ({
  apiFindMock: vi.fn(),
  loadGenericMock: vi.fn(),
  routeState: { query: {} as Record<string, unknown> },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
}))

vi.mock('@/services/api.generic.service', () => ({
  default: {
    find: apiFindMock,
  },
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    getState: (key: string) => getMockedEntityState(key),
    loadGeneric: loadGenericMock,
  }),
}))

import { useSaplingTable } from '../useSaplingTable'

const entityStates = reactive<Record<string, ReturnType<typeof createEntityState>>>({
  partner: createEntityState([
    createTemplate({
      name: 'name',
      type: 'string',
      options: ['isOrderASC'],
    }),
    createTemplate({
      name: 'status',
      type: 'string',
      kind: 'm:1',
      referenceName: 'ticketStatus',
      referencedPks: ['handle'],
    }),
    createTemplate({
      name: 'amount',
      type: 'number',
    }),
  ]),
  contract: createEntityState([
    createTemplate({
      name: 'title',
      type: 'string',
      options: ['isOrderASC'],
    }),
  ]),
  ticket: createEntityState([
    createTemplate({
      name: 'status',
      type: 'string',
      kind: 'm:1',
      referenceName: 'ticketStatus',
      referencedPks: ['handle'],
    }),
    createTemplate({
      name: 'deadlineDate',
      type: 'date',
    }),
    createTemplate({
      name: 'assigneePerson',
      type: 'string',
      kind: 'm:1',
      referenceName: 'person',
      referencedPks: ['handle'],
    }),
  ]),
})

function createTestHost(entityHandle: Ref<string>) {
  return defineComponent({
    setup() {
      return useSaplingTable(entityHandle, 25, false, true)
    },
    template: '<div />',
  })
}

function createQueryEnabledTestHost(entityHandle: Ref<string>) {
  return defineComponent({
    setup() {
      return useSaplingTable(entityHandle, 25, true, true)
    },
    template: '<div />',
  })
}

function createManualTestHost(entityHandle: Ref<string>) {
  return defineComponent({
    setup() {
      return useSaplingTable(entityHandle, 25, false, false)
    },
    template: '<div />',
  })
}

const mountedWrappers: Array<ReturnType<typeof mount>> = []

function mountTestHost(entityHandle: Ref<string>) {
  const wrapper = mount(createTestHost(entityHandle))
  mountedWrappers.push(wrapper)
  return wrapper
}

function mountQueryEnabledTestHost(entityHandle: Ref<string>) {
  const wrapper = mount(createQueryEnabledTestHost(entityHandle))
  mountedWrappers.push(wrapper)
  return wrapper
}

function mountManualTestHost(entityHandle: Ref<string>) {
  const wrapper = mount(createManualTestHost(entityHandle))
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('useSaplingTable', () => {
  beforeEach(() => {
    apiFindMock.mockReset()
    loadGenericMock.mockReset()
    routeState.query = {}
  })

  afterEach(() => {
    vi.useRealTimers()

    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('ignores stale entity initialization when the route entity changes quickly', async () => {
    const entityHandle = ref('partner')
    const partnerDeferred = createDeferred<void>()
    const contractDeferred = createDeferred<void>()

    loadGenericMock.mockImplementation((handle: string) => {
      if (handle === 'partner') {
        return partnerDeferred.promise
      }

      if (handle === 'contract') {
        return contractDeferred.promise
      }

      return Promise.resolve()
    })

    apiFindMock.mockResolvedValue({
      data: [{ handle: 7, title: 'Contract A' }],
      meta: { total: 1 },
    })

    const wrapper = mountTestHost(entityHandle)
    await nextTick()

    entityHandle.value = 'contract'
    await nextTick()

    partnerDeferred.resolve()
    await flushPromises()

    expect(apiFindMock).not.toHaveBeenCalled()

    contractDeferred.resolve()
    await flushPromises()

    expect(apiFindMock).toHaveBeenCalledTimes(1)
    expect(apiFindMock).toHaveBeenCalledWith(
      'contract',
      expect.objectContaining({
        filter: {},
        page: 1,
        limit: 25,
      }),
    )
    expect(wrapper.vm.items).toEqual([{ handle: 7, title: 'Contract A' }])
    expect(wrapper.vm.totalItems).toBe(1)
  })

  it('ignores stale column filter updates while entity state is resetting', async () => {
    const entityHandle = ref('partner')
    const partnerDeferred = createDeferred<void>()
    const contractDeferred = createDeferred<void>()

    loadGenericMock.mockImplementation((handle: string) => {
      if (handle === 'partner') {
        return partnerDeferred.promise
      }

      if (handle === 'contract') {
        return contractDeferred.promise
      }

      return Promise.resolve()
    })

    apiFindMock.mockResolvedValue({
      data: [],
      meta: { total: 0 },
    })

    const wrapper = mountTestHost(entityHandle)
    await nextTick()

    entityHandle.value = 'contract'
    await nextTick()

    const staleFilter: Record<string, ColumnFilterItem> = {
      handle: {
        operator: 'eq',
        value: 'partner',
      },
    }

    wrapper.vm.onColumnFiltersUpdate(staleFilter)

    expect(wrapper.vm.columnFilters).toEqual({})

    partnerDeferred.resolve()
    contractDeferred.resolve()
    await flushPromises()

    expect(apiFindMock).toHaveBeenCalledWith(
      'contract',
      expect.objectContaining({
        filter: {},
      }),
    )
  })

  it('debounces repeated search-triggered reloads into a single request', async () => {
    vi.useFakeTimers()
    loadGenericMock.mockResolvedValue(undefined)
    apiFindMock.mockResolvedValue({
      data: [],
      meta: { total: 0 },
    })

    const wrapper = mountTestHost(ref('partner'))
    await flushPromises()
    apiFindMock.mockClear()

    wrapper.vm.onSearchUpdate('Ada')
    await nextTick()
    wrapper.vm.onSearchUpdate('Adab')
    await nextTick()

    expect(apiFindMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(249)
    expect(apiFindMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(apiFindMock).toHaveBeenCalledTimes(1)
    expect(apiFindMock).toHaveBeenCalledWith(
      'partner',
      expect.objectContaining({
        filter: {
          $or: [{ name: { $ilike: '%Adab%' } }],
        },
      }),
    )
  })

  it('uses an initial search value for the first manual initialization request', async () => {
    loadGenericMock.mockResolvedValue(undefined)
    apiFindMock.mockResolvedValue({
      data: [{ handle: 1, name: 'Ada Lovelace' }],
      meta: { total: 1 },
    })

    const wrapper = mountManualTestHost(ref('partner'))

    await wrapper.vm.initializeEntityState({ initialSearch: 'Ada' })
    await flushPromises()

    expect(apiFindMock).toHaveBeenCalledTimes(1)
    expect(apiFindMock).toHaveBeenCalledWith(
      'partner',
      expect.objectContaining({
        filter: {
          $or: [{ name: { $ilike: '%Ada%' } }],
        },
        page: 1,
        limit: 25,
      }),
    )
    expect(wrapper.vm.search).toBe('Ada')
  })

  it('applies decoded route query filters when query parameters are enabled', async () => {
    loadGenericMock.mockResolvedValue(undefined)
    routeState.query = {
      filter: '{"status":{"handle":"open"},"assigneePerson":{"handle":"{{currentUser.handle}}"}}',
    }
    apiFindMock.mockResolvedValue({
      data: [{ handle: 1, title: 'Open ticket' }],
      meta: { total: 1 },
    })

    const wrapper = mountQueryEnabledTestHost(ref('ticket'))
    await flushPromises()

    expect(apiFindMock).toHaveBeenCalledWith(
      'ticket',
      expect.objectContaining({
        filter: {
          $and: [
            { status: { handle: 'open' } },
            { assigneePerson: { handle: '{{currentUser.handle}}' } },
          ],
        },
      }),
    )
    expect(wrapper.vm.columnFilters).toEqual({
      status: {
        operator: 'eq',
        value: '',
        relationItems: [{ handle: 'open' }],
      },
      assigneePerson: {
        operator: 'eq',
        value: '',
        relationItems: [{ handle: '{{currentUser.handle}}' }],
      },
    })
    expect(wrapper.vm.items).toEqual([{ handle: 1, title: 'Open ticket' }])
    expect(wrapper.vm.totalItems).toBe(1)
  })

  it('restores supported route query filters into the table header state before loading', async () => {
    loadGenericMock.mockResolvedValue(undefined)
    routeState.query = {
      filter:
        '{"$and":[{"name":{"$ilike":"%Ada%"}},{"status":{"$in":["open","pending"]}},{"amount":{"$gte":5,"$lte":10}}]}',
    }
    apiFindMock.mockResolvedValue({
      data: [],
      meta: { total: 0 },
    })

    const wrapper = mountQueryEnabledTestHost(ref('partner'))
    await flushPromises()

    expect(wrapper.vm.columnFilters).toEqual({
      name: {
        operator: 'like',
        value: 'Ada',
      },
      status: {
        operator: 'eq',
        value: '',
        relationItems: [{ handle: 'open' }, { handle: 'pending' }],
      },
      amount: {
        operator: 'between',
        value: '',
        rangeStart: '5',
        rangeEnd: '10',
        rangeStartOperator: 'gte',
        rangeEndOperator: 'lte',
      },
    })
    expect(apiFindMock).toHaveBeenCalledTimes(1)
  })

  it('rehydrates the full url filter into table header filters without a leftover query filter', async () => {
    loadGenericMock.mockResolvedValue(undefined)
    routeState.query = {
      filter:
        '{"status":{"handle":{"$nin":["closed"]}},"deadlineDate":{"$lt":"{{tomorrow.start}}","$gte":"{{today.start}}"},"assigneePerson":{"handle":"{{currentUser.handle}}"}}',
    }
    apiFindMock.mockResolvedValue({
      data: [{ handle: 17, title: 'Today ticket' }],
      meta: { total: 1 },
    })

    const wrapper = mountQueryEnabledTestHost(ref('ticket'))
    await flushPromises()

    expect(wrapper.vm.columnFilters).toEqual({
      status: {
        operator: 'nin',
        value: '',
        relationItems: [{ handle: 'closed' }],
      },
      deadlineDate: {
        operator: 'between',
        value: '',
        rangeStart: '{{today.start}}',
        rangeEnd: '{{tomorrow.start}}',
        rangeStartOperator: 'gte',
        rangeEndOperator: 'lt',
      },
      assigneePerson: {
        operator: 'eq',
        value: '',
        relationItems: [{ handle: '{{currentUser.handle}}' }],
      },
    })

    expect(apiFindMock).toHaveBeenCalledWith(
      'ticket',
      expect.objectContaining({
        filter: {
          $and: [
            {
              status: { handle: { $nin: ['closed'] } },
            },
            {
              $and: [
                {
                  deadlineDate: {
                    $gte: '{{today.start}}',
                  },
                },
                {
                  deadlineDate: {
                    $lt: '{{tomorrow.start}}',
                  },
                },
              ],
            },
            {
              assigneePerson: { handle: '{{currentUser.handle}}' },
            },
          ],
        },
      }),
    )
  })
})

function createEntityState(entityTemplates: EntityTemplate[] = []) {
  return {
    entity: null,
    entityPermission: null,
    entityTranslation: {} as never,
    entityTemplates,
    isLoading: false,
    currentEntityName: '',
    currentNamespaces: [],
  }
}

function getMockedEntityState(key: string) {
  return entityStates[key] ?? createEntityState()
}

function createTemplate(
  overrides: Partial<EntityTemplate> & Pick<EntityTemplate, 'name' | 'type'>,
): EntityTemplate {
  return {
    name: overrides.name,
    key: overrides.name,
    title: overrides.name,
    type: overrides.type,
    kind: overrides.kind,
    options: overrides.options ?? [],
    isAutoIncrement: false,
    isPersistent: true,
    isReference: overrides.isReference ?? false,
    referencedPks: overrides.referencedPks ?? [],
    referenceName: overrides.referenceName,
    length: undefined,
  } as EntityTemplate
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}
