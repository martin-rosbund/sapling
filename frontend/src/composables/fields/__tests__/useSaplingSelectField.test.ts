import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import type { SaplingGenericItem } from '@/entity/entity'
import { useSaplingSelectField } from '../useSaplingSelectField'
import { useSaplingSingleSelectField } from '../useSaplingSingleSelectField'

const MultiSelectHost = defineComponent({
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    return useSaplingSelectField(props as unknown as SelectFieldProps)
  },
  template: '<div />',
})

const SingleSelectHost = defineComponent({
  props: {
    modelValue: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    return useSaplingSingleSelectField(props as unknown as SingleSelectFieldProps)
  },
  template: '<div />',
})

type SelectFieldProps = {
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem[]
}

type SingleSelectFieldProps = {
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem | null
}

describe('select field composables', () => {
  it('updates multi-select chips when the same relation receives display fields', async () => {
    const wrapper = mount(MultiSelectHost, {
      props: {
        modelValue: [{ handle: 'open' }],
      },
    })

    await wrapper.setProps({
      modelValue: [{ handle: 'open', description: 'Offen' }],
    })

    expect(wrapper.vm.selectedItems).toEqual([{ handle: 'open', description: 'Offen' }])
  })

  it('updates single-select chips when the same relation receives display fields', async () => {
    const wrapper = mount(SingleSelectHost, {
      props: {
        modelValue: { handle: 'open' },
      },
    })

    await wrapper.setProps({
      modelValue: { handle: 'open', description: 'Offen' },
    })

    expect(wrapper.vm.selectedItem).toEqual({ handle: 'open', description: 'Offen' })
  })
})
