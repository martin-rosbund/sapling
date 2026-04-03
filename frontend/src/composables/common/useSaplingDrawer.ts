import {
  computed,
  ref,
  watch,
  type CSSProperties,
  type ComputedRef,
  type Ref,
} from 'vue';

const DEFAULT_DRAWER_WIDTH = 380;
const DEFAULT_CLOSED_PERCENT = 0.1;
const MIN_DRAWER_WIDTH = 32;
const DRAWER_OUTER_OFFSET_PX = 65;
const DRAWER_Z_INDEX = 1200;
const DRAWER_TRANSITION = 'width 0.3s cubic-bezier(.4,0,.2,1)';

export interface SaplingDrawerProps {
  width?: number;
  closedPercent?: number;
  modelValue?: boolean;
}

export type SaplingDrawerEmit = (event: 'update:modelValue', value: boolean) => void;

export interface UseSaplingDrawerResult {
  drawerOpen: Ref<boolean>;
  drawerStyle: ComputedRef<CSSProperties>;
  setDrawerOpen: (value: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

/**
 * Normalizes the configured drawer width so the component never renders invalid sizes.
 */
function normalizeDrawerWidth(width?: number): number {
  const normalizedWidth = width ?? DEFAULT_DRAWER_WIDTH;

  if (!Number.isFinite(normalizedWidth)) {
    return DEFAULT_DRAWER_WIDTH;
  }

  return Math.max(Math.round(normalizedWidth), MIN_DRAWER_WIDTH);
}

/**
 * Restricts the collapsed width percentage to the valid CSS width range.
 */
function normalizeClosedPercent(percent?: number): number {
  const normalizedPercent = percent ?? DEFAULT_CLOSED_PERCENT;

  if (!Number.isFinite(normalizedPercent)) {
    return DEFAULT_CLOSED_PERCENT;
  }

  return Math.min(Math.max(normalizedPercent, 0), 1);
}

/**
 * Encapsulates all Sapling drawer state, sizing logic and `v-model` synchronization.
 */
export function useSaplingDrawer(
  props: SaplingDrawerProps,
  emit: SaplingDrawerEmit,
): UseSaplingDrawerResult {
  //#region State
  const drawerOpen = ref(Boolean(props.modelValue));

  const drawerWidth = computed(() => normalizeDrawerWidth(props.width));
  const closedWidth = computed(() => Math.max(
    MIN_DRAWER_WIDTH,
    Math.round(drawerWidth.value * normalizeClosedPercent(props.closedPercent)),
  ));

  watch(
    () => props.modelValue,
    (value) => {
      const nextValue = Boolean(value);

      if (nextValue !== drawerOpen.value) {
        drawerOpen.value = nextValue;
      }
    },
    { immediate: true },
  );

  const drawerStyle = computed((): CSSProperties => ({
    position: 'fixed',
    top: `${DRAWER_OUTER_OFFSET_PX}px`,
    right: '0',
    height: `calc(100dvh - ${DRAWER_OUTER_OFFSET_PX * 2}px)`,
    width: `${drawerOpen.value ? drawerWidth.value : closedWidth.value}px`,
    transition: DRAWER_TRANSITION,
    zIndex: DRAWER_Z_INDEX,
    boxShadow: '-2px 0 12px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }));
  //#endregion

  //#region Methods
  /**
   * Applies the next drawer state locally and forwards it through the component contract.
   */
  function setDrawerOpen(value: boolean) {
    if (drawerOpen.value === value) {
      return;
    }

    drawerOpen.value = value;
    emit('update:modelValue', value);
  }

  /**
   * Opens the drawer.
   */
  function openDrawer() {
    setDrawerOpen(true);
  }

  /**
   * Closes the drawer.
   */
  function closeDrawer() {
    setDrawerOpen(false);
  }

  /**
   * Toggles the drawer between expanded and collapsed state.
   */
  function toggleDrawer() {
    setDrawerOpen(!drawerOpen.value);
  }
  //#endregion

  //#region Return
  return {
    drawerOpen,
    drawerStyle,
    setDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
  //#endregion
}
