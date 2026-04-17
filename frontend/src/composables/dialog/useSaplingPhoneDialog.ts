import { computed, reactive } from 'vue'

export type SaplingPhoneDialogContext = {
  phoneNumber: string
  entityHandle?: string
  itemHandle?: string | number
  draftValues?: Record<string, unknown>
}

const state = reactive<{
  open: boolean
  context: SaplingPhoneDialogContext | null
}>({
  open: false,
  context: null,
})

export function useSaplingPhoneDialog() {
  function openPhoneDialog(context: SaplingPhoneDialogContext) {
    state.context = context
    state.open = true
  }

  function closePhoneDialog() {
    state.open = false
    state.context = null
  }

  return {
    state,
    isOpen: computed(() => state.open),
    context: computed(() => state.context),
    openPhoneDialog,
    closePhoneDialog,
  }
}
