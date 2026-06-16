import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SaplingFieldSelect from '../SaplingFieldSelect.vue'

const { loadDataMock, onSearchUpdateMock, tableState } = vi.hoisted(() => {
  const makeRef = <T,>(value: T) => ({ value })
  const state = {
    items: makeRef<Array<Record<string, unknown>>>([]),
    search: makeRef(''),
    page: makeRef(1),
    itemsPerPage: makeRef(25),
    totalItems: makeRef(0),
    isLoading: makeRef(false),
    sortBy: makeRef<Array<Record<string, unknown>>>([]),
    columnFilters: makeRef({}),
    activeFilter: makeRef(null),
    entityTemplates: makeRef([
      {
        name: 'description',
        options: ['isValue'],
      },
    ]),
    entity: makeRef(null),
    entityPermission: makeRef(null),
    parentFilter: makeRef(null),
    isInitialized: makeRef(true),
  }

  const onSearchUpdate = vi.fn((value: string) => {
    state.search.value = value
  })

  return {
    loadDataMock: vi.fn(),
    onSearchUpdateMock: onSearchUpdate,
    tableState: state,
  }
})

vi.mock('@/composables/table/useSaplingTable', () => ({
  useSaplingTable: () => ({
    ...tableState,
    initializeEntityState: vi.fn(),
    loadData: loadDataMock,
    onSearchUpdate: onSearchUpdateMock,
    onPageUpdate: vi.fn(),
    onItemsPerPageUpdate: vi.fn(),
    onColumnFiltersUpdate: vi.fn(),
    onSortByUpdate: vi.fn(),
  }),
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    loadGeneric: vi.fn(),
  }),
}))

const VMenuStub = defineComponent({
  name: 'VMenu',
  props: {
    modelValue: Boolean,
  },
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
})

const VAutocompleteStub = defineComponent({
  name: 'VAutocomplete',
  props: {
    search: String,
  },
  emits: ['update:search', 'update:modelValue', 'focus', 'mousedown:control', 'click:clear'],
  template: '<div />',
})

const SaplingTableStub = defineComponent({
  name: 'SaplingTable',
  emits: ['update:selected'],
  template: '<div />',
})

function mountSelectField(modelValue: Array<Record<string, unknown>> = []) {
  return mount(SaplingFieldSelect, {
    props: {
      label: 'Batches',
      entityHandle: 'batch',
      modelValue,
    },
    global: {
      stubs: {
        'v-menu': VMenuStub,
        'v-autocomplete': VAutocompleteStub,
        SaplingTable: SaplingTableStub,
      },
    },
  })
}

describe('SaplingFieldSelect', () => {
  beforeEach(() => {
    onSearchUpdateMock.mockClear()
    tableState.items.value = []
    tableState.search.value = ''
  })

  it('keeps the typed search when a selected chip label is emitted as autocomplete search', async () => {
    const wrapper = mountSelectField()

    const autocomplete = wrapper.findComponent(VAutocompleteStub)
    await autocomplete.vm.$emit('update:search', 'bat')

    expect(onSearchUpdateMock).toHaveBeenLastCalledWith('bat')
    expect(tableState.search.value).toBe('bat')

    const selectedBatch = { handle: 'batch-1', description: 'Batch 1' }
    await wrapper.find('.sapling-menu-surface').trigger('mousedown')
    await autocomplete.vm.$emit('update:search', '')
    await wrapper.findComponent(SaplingTableStub).vm.$emit('update:selected', [selectedBatch])
    await autocomplete.vm.$emit('update:search', 'Batch 1')

    expect(onSearchUpdateMock).toHaveBeenCalledTimes(1)
    expect(tableState.search.value).toBe('bat')
    const modelValueEvents = wrapper.emitted('update:modelValue') ?? []
    expect(modelValueEvents[modelValueEvents.length - 1]?.[0]).toEqual([selectedBatch])

    await autocomplete.vm.$emit('update:search', 'Batch 1')

    expect(onSearchUpdateMock).toHaveBeenLastCalledWith('Batch 1')
    expect(tableState.search.value).toBe('Batch 1')
  })

  it('keeps selections that are not part of the currently filtered table items', async () => {
    const existingBatch = { handle: 'batch-1', description: 'Batch 1' }
    const filteredBatch = { handle: 'batch-2', description: 'Batch 2' }
    tableState.items.value = [filteredBatch]

    const wrapper = mountSelectField([existingBatch])
    await wrapper.findComponent(VAutocompleteStub).vm.$emit('focus')

    await wrapper.findComponent(SaplingTableStub).vm.$emit('update:selected', [filteredBatch])
    await nextTick()

    let modelValueEvents = wrapper.emitted('update:modelValue') ?? []
    expect(modelValueEvents[modelValueEvents.length - 1]?.[0]).toEqual([
      existingBatch,
      filteredBatch,
    ])
  })
})
