import { ref, computed, type CSSProperties } from 'vue';

export function useSaplingDrawer(
  props: {
    width: number;
    closedPercent: number;
    modelValue: boolean;
  },
  emit: (event: 'update:modelValue', value: boolean) => void
) {
  const drawerOpen = ref(props.modelValue);
  const drawerWidth = props.width;
  const closedWidth = Math.round(drawerWidth * props.closedPercent);

  const drawerStyle = computed((): CSSProperties => ({
    position: 'fixed',
    top: '73px',
    right: '0',
    height: 'calc(100dvh - 137px)',
    width: drawerOpen.value ? drawerWidth + 'px' : closedWidth + 'px',
    transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
    zIndex: 1200,
    boxShadow: '-2px 0 12px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }));

  function toggleDrawer() {
    drawerOpen.value = !drawerOpen.value;
    emit('update:modelValue', drawerOpen.value);
  }

  return {
    drawerOpen,
    drawerStyle,
    toggleDrawer,
  };
}
