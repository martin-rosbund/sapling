import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  type CSSProperties,
  type ComputedRef,
  type Ref,
} from 'vue'
import { useRouter } from 'vue-router'

export interface UseSaplingContextMenuResult {
  menuVisible: Ref<boolean>
  menuStyle: ComputedRef<CSSProperties>
  closeMenu: () => void
  goHome: () => Promise<void>
  handleContextMenu: (event: MouseEvent) => void
}

/**
 * Provides the global browser context menu replacement used by the shell.
 * The composable owns the menu position, open state and lifecycle bindings.
 */
export function useSaplingContextMenu(): UseSaplingContextMenuResult {
  //#region State
  const router = useRouter()
  const menuVisible = ref(false)
  const x = ref(0)
  const y = ref(0)

  const menuStyle = computed<CSSProperties>(() => ({
    top: `${y.value}px`,
    left: `${x.value}px`,
  }))
  //#endregion

  //#region Lifecycle
  onMounted(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('contextmenu', handleContextMenu)
  })

  onUnmounted(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.removeEventListener('contextmenu', handleContextMenu)
  })
  //#endregion

  //#region Methods
  /**
   * Intercepts the native browser context menu and reopens the Sapling menu at the cursor position.
   */
  function handleContextMenu(event: MouseEvent) {
    event.preventDefault()

    menuVisible.value = false
    x.value = event.clientX
    y.value = event.clientY

    void nextTick(() => {
      menuVisible.value = true
    })
  }

  /**
   * Hides the menu locally.
   */
  function closeMenu() {
    menuVisible.value = false
  }

  /**
   * Navigates to the application home route and closes the menu afterwards.
   */
  async function goHome() {
    await router.push({ name: 'home' })
    closeMenu()
  }
  //#endregion

  //#region Return
  return {
    menuVisible,
    menuStyle,
    closeMenu,
    goHome,
    handleContextMenu,
  }
  //#endregion
}
