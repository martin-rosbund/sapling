<template>
  <div
    class="sapling-navigation-drawer"
    :class="{ 'sapling-drawer-open': drawerOpen, 'sapling-drawer-closed': !drawerOpen }"
    :style="drawerStyle">
    <div class="sapling-drawer-edge" @click="toggleDrawer">
      <v-icon v-if="!drawerOpen">mdi-chevron-left</v-icon>
      <v-icon v-else>mdi-chevron-right</v-icon>
    </div>
    <transition name="sapling-drawer-content">
      <div v-show="drawerOpen" class="sapling-drawer-content">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import '@/assets/styles/SaplingDrawer.css';
import { useSaplingDrawer } from '@/composables/common/useSaplingDrawer';

const props = defineProps({
  width: { type: Number, default: 380 },
  closedPercent: { type: Number, default: 0.1 },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const { drawerOpen, drawerStyle, toggleDrawer } = useSaplingDrawer(props, emit);
</script>