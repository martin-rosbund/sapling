import { computed, ref } from 'vue'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'

const isSaplingVectorizationOpen = ref(false)

export function useSaplingVectorization() {
  const currentPersonStore = useCurrentPersonStore()

  const hasSaplingVectorizationAccess = computed(
    () =>
      currentPersonStore.person?.roles?.some((role) => {
        if (!role || typeof role === 'string') {
          return false
        }

        return role.isAdministrator === true
      }) ?? false,
  )

  async function ensureSaplingVectorizationAccess() {
    await currentPersonStore.fetchCurrentPerson()

    if (!hasSaplingVectorizationAccess.value) {
      isSaplingVectorizationOpen.value = false
    }

    return hasSaplingVectorizationAccess.value
  }

  async function openSaplingVectorization() {
    if (!(await ensureSaplingVectorizationAccess())) {
      return false
    }

    isSaplingVectorizationOpen.value = true
    return true
  }

  function closeSaplingVectorization() {
    isSaplingVectorizationOpen.value = false
  }

  async function toggleSaplingVectorization() {
    if (isSaplingVectorizationOpen.value) {
      closeSaplingVectorization()
      return true
    }

    return openSaplingVectorization()
  }

  void ensureSaplingVectorizationAccess()

  return {
    isOpen: isSaplingVectorizationOpen,
    hasSaplingVectorizationAccess,
    ensureSaplingVectorizationAccess,
    openSaplingVectorization,
    closeSaplingVectorization,
    toggleSaplingVectorization,
  }
}
