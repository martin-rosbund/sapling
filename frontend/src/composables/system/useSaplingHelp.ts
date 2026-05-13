import { ref } from 'vue'

/**
 * Module-level singleton so the help dialog can be opened from anywhere
 * (global F1 shortcut, command palette action, profile menu) while remaining
 * a single mounted instance in the shell.
 */
const isSaplingHelpOpen = ref(false)

export function useSaplingHelp() {
  function openSaplingHelp() {
    isSaplingHelpOpen.value = true
  }

  function closeSaplingHelp() {
    isSaplingHelpOpen.value = false
  }

  function toggleSaplingHelp() {
    isSaplingHelpOpen.value = !isSaplingHelpOpen.value
  }

  return {
    isOpen: isSaplingHelpOpen,
    openSaplingHelp,
    closeSaplingHelp,
    toggleSaplingHelp,
  }
}
