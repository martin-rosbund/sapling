import { ref, type Ref } from 'vue'

export function useSaplingGenericReferenceDialog(options: {
  ensureTargetResolved: () => Promise<unknown>
  targetEntity: Ref<unknown>
}) {
  const dialogOpen = ref(false)

  async function openTargetDialog() {
    const targetRecord = await options.ensureTargetResolved()
    if (!targetRecord || !options.targetEntity.value) {
      return
    }

    dialogOpen.value = true
  }

  return {
    dialogOpen,
    openTargetDialog,
  }
}
