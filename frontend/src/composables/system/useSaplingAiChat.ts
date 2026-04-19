import { computed, ref } from 'vue'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'

const SAPLING_AI_CHAT_REQUIRED_ENTITY_HANDLES = [
  'aiChatSession',
  'aiProviderType',
  'aiProviderModel',
] as const

const isSaplingAiChatOpen = ref(false)

export function useSaplingAiChat() {
  const currentPermissionStore = useCurrentPermissionStore()

  const hasSaplingAiChatAccess = computed(() => {
    const permissions = currentPermissionStore.accumulatedPermission

    if (!currentPermissionStore.loaded || !permissions) {
      return false
    }

    return SAPLING_AI_CHAT_REQUIRED_ENTITY_HANDLES.every((entityHandle) =>
      permissions.some(
        (permission) => permission.entityHandle === entityHandle && permission.allowRead,
      ),
    )
  })

  async function ensureSaplingAiChatAccess() {
    await currentPermissionStore.fetchCurrentPermission()

    if (!hasSaplingAiChatAccess.value) {
      isSaplingAiChatOpen.value = false
    }

    return hasSaplingAiChatAccess.value
  }

  async function openSaplingAiChat() {
    if (!(await ensureSaplingAiChatAccess())) {
      return false
    }

    isSaplingAiChatOpen.value = true
    return true
  }

  function closeSaplingAiChat() {
    isSaplingAiChatOpen.value = false
  }

  async function toggleSaplingAiChat() {
    if (isSaplingAiChatOpen.value) {
      closeSaplingAiChat()
      return true
    }

    return openSaplingAiChat()
  }

  void ensureSaplingAiChatAccess()

  return {
    isOpen: isSaplingAiChatOpen,
    hasSaplingAiChatAccess,
    ensureSaplingAiChatAccess,
    openSaplingAiChat,
    closeSaplingAiChat,
    toggleSaplingAiChat,
  }
}
