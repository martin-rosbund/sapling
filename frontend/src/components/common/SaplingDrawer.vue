<template>
  <div
    class="custom-navigation-drawer"
    :class="{ 'drawer-open': drawerOpen, 'drawer-closed': !drawerOpen }"
    :style="drawerStyle"
  >
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

const props = defineProps({
  width: { type: Number, default: 340 },
  closedPercent: { type: Number, default: 0.1 },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const drawerOpen = ref(props.modelValue);
const drawerWidth = props.width;
const closedWidth = Math.round(drawerWidth * props.closedPercent);

const drawerStyle = computed((): CSSProperties => ({
  position: 'fixed',
  top: '0',
  right: '0',
  height: '100%',
  width: drawerOpen.value ? drawerWidth + 'px' : closedWidth + 'px',
  transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
  zIndex: 1200,
  boxShadow: '-2px 0 12px rgba(0,0,0,0.15)',
  background: 'rgba(30,30,40,0.7)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value;
  emit('update:modelValue', drawerOpen.value);
}
</script>

<style scoped>
.custom-navigation-drawer {
  pointer-events: auto;
}
.drawer-edge {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,30,40,0.5);
  cursor: pointer;
  z-index: 2;
  border-left: 1px solid rgba(255,255,255,0.1);
  transition: background 0.2s;
}
.drawer-edge:hover {
  background: rgba(30,30,40,0.8);
}
.drawer-content {
  width: calc(100% - 34px);
  margin-left: 34px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.drawer-closed .drawer-content {
  display: none;
}
.drawer-open .drawer-content {
  display: flex;
}
.drawer-content {
  transition: opacity 0.2s;
}
.drawer-content[style*="display: none"] {
  opacity: 0;
}
.drawer-content[style*="display: flex"] {
  opacity: 1;
}
.drawer-content {
  background: transparent;
}
</style>
