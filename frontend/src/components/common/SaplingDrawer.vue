<template>
  <div
    class="custom-navigation-drawer"
    :class="{ 'drawer-open': drawerOpen, 'drawer-closed': !drawerOpen }"
    :style="drawerStyle">
    <div class="drawer-edge" @click="toggleDrawer">
      <v-icon v-if="!drawerOpen">mdi-chevron-left</v-icon>
      <v-icon v-else>mdi-chevron-right</v-icon>
    </div>
    <transition name="drawer-content">
      <div v-show="drawerOpen" class="drawer-content">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, type CSSProperties } from 'vue';
import '@/assets/styles/SaplingDrawer.css';

const props = defineProps({
  width: { type: Number, default: 380 },
  closedPercent: { type: Number, default: 0.1 },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const drawerOpen = ref(props.modelValue);
const drawerWidth = props.width;
const closedWidth = Math.round(drawerWidth * props.closedPercent);

const drawerStyle = computed((): CSSProperties => ({
  position: 'fixed',
  top: '65px',
  right: '0',
  height: 'calc(100dvh - 130px)',
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
</script>