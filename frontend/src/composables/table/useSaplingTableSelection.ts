import { computed, ref, watch } from 'vue'
import type { SaplingGenericItem } from '@/entity/entity'

interface UseSaplingTableSelectionProps {
  items: SaplingGenericItem[]
  multiSelect?: boolean
  selected?: SaplingGenericItem[]
}

type UseSaplingTableSelectionEmit = {
  (event: 'update:selected', value: SaplingGenericItem[]): void
}

export function useSaplingTableSelection(
  props: UseSaplingTableSelectionProps,
  emit: UseSaplingTableSelectionEmit,
) {
  const selectedRows = ref<number[]>([])
  const selectedRow = ref<number | null>(null)

  const selectedItems = computed(() =>
    selectedRows.value
      .map((index) => props.items[index])
      .filter((item): item is SaplingGenericItem => Boolean(item)),
  )

  watch(
    () => [props.selected, props.items, props.multiSelect] as const,
    ([newSelected]) => {
      const nextSelected = Array.isArray(newSelected) ? newSelected : []
      const selectedIdentities = new Set(
        nextSelected
          .map((selectedItem) => getGenericItemIdentity(selectedItem))
          .filter((identity) => identity.length > 0),
      )

      selectedRows.value = props.items.reduce<number[]>((indexes, item, index) => {
        if (selectedIdentities.has(getGenericItemIdentity(item))) {
          indexes.push(index)
        }

        return indexes
      }, [])

      selectedRow.value = props.multiSelect ? null : (selectedRows.value[0] ?? null)
    },
    { immediate: true },
  )

  function selectAllRows() {
    selectedRows.value = props.items.map((_, index) => index)
    emitSelectedItems()
  }

  function selectRow(index: number) {
    const nextItem = props.items[index]
    if (!nextItem) {
      return
    }

    if (props.multiSelect) {
      const selectedIndex = selectedRows.value.indexOf(index)
      if (selectedIndex === -1) {
        selectedRows.value = [...selectedRows.value, index]
      } else {
        selectedRows.value = selectedRows.value.filter((rowIndex) => rowIndex !== index)
      }

      emitSelectedItems()
      return
    }

    selectedRow.value = index
    emit('update:selected', [nextItem])
  }

  function clearSelection() {
    selectedRows.value = []
    selectedRow.value = null
    emit('update:selected', [])
  }

  function emitSelectedItems() {
    emit('update:selected', selectedItems.value)
  }

  return {
    selectedItems,
    selectedRows,
    selectedRow,
    selectAllRows,
    selectRow,
    clearSelection,
  }
}

function getGenericItemIdentity(item?: SaplingGenericItem) {
  const handle = getItemHandle(item)
  if (handle != null) {
    return `handle:${String(handle)}`
  }

  if (item && typeof item === 'object') {
    return JSON.stringify(item)
  }

  return ''
}

function getItemHandle(item?: SaplingGenericItem | null) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const { handle } = item
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
}
