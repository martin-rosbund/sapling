import type { SaplingGenericItem } from '@/entity/entity'
import { ref, watch } from 'vue'

export function useSaplingSingleSelectField(props: {
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem | null | undefined
  rules?: Array<(v: unknown) => true | string>
}) {
  const menuOpen = ref(false)
  const selectedItem = ref<SaplingGenericItem | null>(props.modelValue ?? null)

  watch(
    () => props.modelValue,
    (val) => {
      const nextValue = val ?? null
      if (!areSameItem(selectedItem.value, nextValue)) {
        selectedItem.value = nextValue
      }
    },
  )

  return {
    menuOpen,
    selectedItem,
  }
}

function areSameItem(left: SaplingGenericItem | null, right: SaplingGenericItem | null) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return JSON.stringify(left) === JSON.stringify(right)
}
