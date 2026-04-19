import { ref } from 'vue'

const isSaplingAiChatOpen = ref(false)

export function useSaplingAiChat() {
  function openSaplingAiChat() {
    isSaplingAiChatOpen.value = true
  }

  function closeSaplingAiChat() {
    isSaplingAiChatOpen.value = false
  }

  function toggleSaplingAiChat() {
    isSaplingAiChatOpen.value = !isSaplingAiChatOpen.value
  }

  return {
    isOpen: isSaplingAiChatOpen,
    openSaplingAiChat,
    closeSaplingAiChat,
    toggleSaplingAiChat,
  }
}
