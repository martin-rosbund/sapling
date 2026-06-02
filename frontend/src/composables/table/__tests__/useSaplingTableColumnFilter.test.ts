import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColumnFilterItem } from '@/entity/structure'

const { findMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'filter.selectedCount': `selected:${values?.count ?? 0}`,
        'filter.to': 'bis',
        'filter.currentUser': 'Aktueller Benutzer',
        'filter.currentCompany': 'Aktuelles Unternehmen',
        'filter.todayStart': 'Heute',
        'filter.tomorrowStart': 'Morgen',
        'person.handle': 'Kennung',
        'company.name': 'Name',
      }

      return translations[key] ?? key
    },
  }),
}))

vi.mock('@/composables/generic/useTranslationLoader', () => ({
  useTranslationLoader: () => ({
    isLoading: ref(false),
  }),
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    getState: (entityHandle: string) => ({
      entityTemplates:
        entityHandle === 'ticketStatus'
          ? [{ name: 'description', type: 'StringType', options: ['isValue'] }]
          : [],
    }),
  }),
}))

vi.mock('@/services/api.generic.service', () => ({
  default: {
    find: findMock,
  },
}))

import {
  useSaplingTableColumnFilter,
  type SaplingTableColumnFilterProps,
} from '../useSaplingTableColumnFilter'

const TestHost = defineComponent({
  props: {
    column: {
      type: Object,
      required: true,
    },
    filterItem: {
      type: Object,
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    operatorOptions: {
      type: Array,
      required: true,
    },
    sortIcon: {
      type: String,
      default: 'mdi-swap-vertical',
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:filter'],
  setup(props, { emit }) {
    return useSaplingTableColumnFilter(
      props as unknown as SaplingTableColumnFilterProps,
      emit as never,
    )
  },
  template: '<div />',
})

describe('useSaplingTableColumnFilter', () => {
  beforeEach(() => {
    findMock.mockReset()
  })

  it('resolves translated relation labels for automatically rehydrated relation filters', async () => {
    findMock.mockResolvedValueOnce({
      data: [{ handle: 'closed', description: 'Geschlossen' }],
    })

    const wrapper = mount(TestHost, {
      props: {
        column: {
          key: 'status',
          name: 'status',
          kind: 'm:1',
          referenceName: 'ticketStatus',
        },
        filterItem: {
          operator: 'eq',
          value: '',
          relationItems: [{ handle: 'closed' }],
        } satisfies ColumnFilterItem,
        title: 'Status',
        operatorOptions: [{ label: '=', value: 'eq' }],
      },
    })

    await flushPromises()

    expect(findMock).toHaveBeenCalledWith('ticketStatus', {
      filter: { handle: 'closed' },
      limit: 1,
    })
    expect(wrapper.vm.filterSummary).toBe('Geschlossen')
    expect(wrapper.vm.relationDisplayItems).toEqual([
      { handle: 'closed', description: 'Geschlossen' },
    ])
  })

  it('renders dynamic placeholder values in a more readable summary', () => {
    const wrapper = mount(TestHost, {
      props: {
        column: {
          key: 'assigneePerson',
          name: 'assigneePerson',
          kind: 'm:1',
          referenceName: 'person',
        },
        filterItem: {
          operator: 'eq',
          value: '',
          relationItems: [{ handle: '{{currentUser.handle}}' }],
        } satisfies ColumnFilterItem,
        title: 'Verantwortlich',
        operatorOptions: [{ label: '=', value: 'eq' }],
      },
    })

    expect(wrapper.vm.filterSummary).toBe('Aktueller Benutzer: Kennung')
  })

  it('renders current company placeholders with server translations', () => {
    const wrapper = mount(TestHost, {
      props: {
        column: {
          key: 'customerCompany',
          name: 'customerCompany',
          kind: 'm:1',
          referenceName: 'company',
        },
        filterItem: {
          operator: 'eq',
          value: '',
          relationItems: [{ handle: '{{currentCompany.name}}' }],
        } satisfies ColumnFilterItem,
        title: 'Unternehmen',
        operatorOptions: [{ label: '=', value: 'eq' }],
      },
    })

    expect(wrapper.vm.filterSummary).toBe('Aktuelles Unternehmen: Name')
  })

  it('shows dynamic date windows as a range filter and falls back to text inputs for placeholders', () => {
    const wrapper = mount(TestHost, {
      props: {
        column: {
          key: 'deadlineDate',
          name: 'deadlineDate',
          type: 'date',
        },
        filterItem: {
          operator: 'between',
          value: '',
          rangeStart: '{{today.start}}',
          rangeEnd: '{{tomorrow.start}}',
          rangeStartOperator: 'gte',
          rangeEndOperator: 'lt',
        } satisfies ColumnFilterItem,
        title: 'Deadline',
        operatorOptions: [
          { label: '=', value: 'eq' },
          { label: '..', value: 'between' },
          { label: '<', value: 'lt' },
        ],
      },
    })

    expect(wrapper.vm.filterVariant).toBe('range')
    expect(wrapper.vm.inputType).toBe('text')
    expect(wrapper.vm.filterSummary).toBe('Heute bis Morgen')
  })
})
