import { computed, ref, watch, type CSSProperties, type ComputedRef, type Ref } from 'vue'

const DEFAULT_DRAWER_WIDTH = 380
const DRAWER_EDGE_WIDTH = 32
const DRAWER_HOTSPOT_WIDTH = 14
const MIN_DRAWER_WIDTH = 32
const DRAWER_OUTER_OFFSET_PX = 66
const DRAWER_Z_INDEX = 1200
const DRAWER_TRANSITION = 'transform 0.28s cubic-bezier(.4,0,.2,1)'

export interface SaplingDrawerProps {
  width?: number
  modelValue?: boolean
}

export type SaplingDrawerEmit = (event: 'update:modelValue', value: boolean) => void

export interface UseSaplingDrawerResult {
  drawerOpen: Ref<boolean>
  drawerEdgeVisible: Ref<boolean>
  drawerAnchorStyle: ComputedRef<CSSProperties>
  drawerStyle: ComputedRef<CSSProperties>
  setDrawerOpen: (value: boolean) => void
  closeDrawer: () => void
  toggleDrawer: () => void
  showDrawerEdge: () => void
  hideDrawerEdge: () => void
  handleFocusOut: (event: FocusEvent) => void
}

/**
 * Normalizes the configured drawer width so the component never renders invalid sizes.
 */
function normalizeDrawerWidth(width?: number): number {
  const normalizedWidth = width ?? DEFAULT_DRAWER_WIDTH

  if (!Number.isFinite(normalizedWidth)) {
    return DEFAULT_DRAWER_WIDTH
  }

  return Math.max(Math.round(normalizedWidth), MIN_DRAWER_WIDTH)
}

/**
 * Encapsulates all Sapling drawer state, sizing logic and `v-model` synchronization.
 */
export function useSaplingDrawer(
  props: SaplingDrawerProps,
  emit: SaplingDrawerEmit,
): UseSaplingDrawerResult {
  //#region State
  const drawerOpen = ref(Boolean(props.modelValue))
  const drawerEdgeVisible = ref(drawerOpen.value)

  const drawerWidth = computed(() => normalizeDrawerWidth(props.width))
  const hiddenOffset = computed(() => drawerWidth.value)
  const edgeVisibleOffset = computed(() => Math.max(drawerWidth.value - DRAWER_EDGE_WIDTH, 0))

  watch(
    () => props.modelValue,
    (value) => {
      setDrawerOpen(Boolean(value), false)
    },
    { immediate: true },
  )

  const drawerAnchorStyle = computed(
    (): CSSProperties => ({
      position: 'fixed',
      top: `${DRAWER_OUTER_OFFSET_PX}px`,
      right: '0',
      height: `100dvh`,
      width: `${drawerWidth.value}px`,
      zIndex: DRAWER_Z_INDEX,
      pointerEvents: 'none',
    }),
  )

  const drawerStyle = computed(
    (): CSSProperties => ({
      '--sapling-drawer-edge-width': `${DRAWER_EDGE_WIDTH}px`,
      '--sapling-drawer-hotspot-width': `${DRAWER_HOTSPOT_WIDTH}px`,
      position: 'absolute',
      top: '0',
      right: '0',
      height: '100%',
      width: `${drawerWidth.value}px`,
      transform: drawerOpen.value
        ? 'translateX(0)'
        : drawerEdgeVisible.value
          ? `translateX(${edgeVisibleOffset.value}px)`
          : `translateX(${hiddenOffset.value}px)`,
      transition: DRAWER_TRANSITION,
      boxShadow:
        drawerOpen.value || drawerEdgeVisible.value ? '-2px 0 12px rgba(0,0,0,0.15)' : 'none',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: drawerOpen.value || drawerEdgeVisible.value ? 'auto' : 'none',
    }),
  )
  //#endregion

  //#region Methods
  /**
   * Applies the next drawer state locally and forwards it through the component contract.
   */
  function setDrawerOpen(value: boolean, emitChange = true) {
    if (drawerOpen.value === value) {
      if (value) {
        drawerEdgeVisible.value = true
      }
      return
    }

    drawerOpen.value = value
    drawerEdgeVisible.value = value

    if (emitChange) {
      emit('update:modelValue', value)
    }
  }

  /**
   * Shows the drawer handle while the pointer is near the screen edge.
   */
  function showDrawerEdge() {
    drawerEdgeVisible.value = true
  }

  /**
   * Hides the drawer handle once the pointer leaves and the drawer is not pinned open.
   */
  function hideDrawerEdge() {
    if (drawerOpen.value) {
      return
    }

    drawerEdgeVisible.value = false
  }

  /**
   * Closes the drawer.
   */
  function closeDrawer() {
    setDrawerOpen(false)
  }

  /**
   * Toggles the full drawer visibility from the edge handle.
   */
  function toggleDrawer() {
    if (drawerOpen.value) {
      closeDrawer()
      drawerEdgeVisible.value = true
      return
    }

    setDrawerOpen(true)
  }

  /**
   * Hides the handle when focus leaves the drawer subtree while the drawer is closed.
   */
  function handleFocusOut(event: FocusEvent) {
    const currentTarget = event.currentTarget
    const relatedTarget = event.relatedTarget

    if (
      currentTarget instanceof HTMLElement &&
      relatedTarget instanceof Node &&
      currentTarget.contains(relatedTarget)
    ) {
      return
    }

    if (!drawerOpen.value) {
      hideDrawerEdge()
    }
  }
  //#endregion

  //#region Return
  return {
    drawerOpen,
    drawerEdgeVisible,
    drawerAnchorStyle,
    drawerStyle,
    setDrawerOpen,
    closeDrawer,
    toggleDrawer,
    showDrawerEdge,
    hideDrawerEdge,
    handleFocusOut,
  }
  //#endregion
}
