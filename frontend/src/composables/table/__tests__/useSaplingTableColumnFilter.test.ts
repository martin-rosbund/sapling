import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ColumnFilterItem } from '@/entity/structure'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'filter.selectedCount' ? `selected:${values?.count ?? 0}` : key,
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
  it('uses the configured isValue relation field in the filter summary', () => {
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
          relationItems: [{ handle: 'closed', description: 'Geschlossen' }],
        } satisfies ColumnFilterItem,
        title: 'Status',
        operatorOptions: [{ label: '=', value: 'eq' }],
      },
    })

    expect(wrapper.vm.filterSummary).toBe('Geschlossen')
  })
})
