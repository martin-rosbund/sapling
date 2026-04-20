import { computed, reactive } from 'vue'

export type SaplingMailDialogContext = {
  entityHandle: string
  itemHandle?: string | number
  draftValues?: Record<string, unknown>
  initialTo?: string[]
  initialSubject?: string
}

const state = reactive<{
  open: boolean
  context: SaplingMailDialogContext | null
}>({
  open: false,
  context: null,
})

export function useSaplingMailDialog() {
  function openMailDialog(context: SaplingMailDialogContext) {
    state.context = context
    state.open = true
  }

  function closeMailDialog() {
    state.open = false
    state.context = null
  }

  return {
    state,
    isOpen: computed(() => state.open),
    context: computed(() => state.context),
    openMailDialog,
    closeMailDialog,
  }
}
