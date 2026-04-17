import type { SaplingGenericItem } from '@/entity/entity'
import { ref, watch } from 'vue'

export function useSaplingSelectField(props: {
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem[]
  rules?: Array<(v: unknown) => true | string>
}) {
  const menuOpen = ref(false)
  const selectedItems = ref<SaplingGenericItem[]>(props.modelValue ?? [])

  watch(
    () => props.modelValue,
    (val) => {
      const nextValue = val ?? []
      if (!areSameItemCollections(selectedItems.value, nextValue)) {
        selectedItems.value = nextValue
      }
    },
  )

  return {
    menuOpen,
    selectedItems,
  }
}

function areSameItemCollections(left: SaplingGenericItem[], right: SaplingGenericItem[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((item, index) => getItemIdentity(item) === getItemIdentity(right[index]))
}

function getItemIdentity(item?: SaplingGenericItem) {
  if (!item || typeof item !== 'object') {
    return ''
  }

  for (const key of ['handle', 'id']) {
    const value = item[key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${key}:${String(value)}`
    }
  }

  return JSON.stringify(item)
}
