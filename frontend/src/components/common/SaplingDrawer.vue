<template>
  <div
    class="sapling-navigation-drawer"
    :class="{ 'sapling-drawer-open': drawerOpen, 'sapling-drawer-closed': !drawerOpen }"
    :style="drawerStyle">
    <div
      class="sapling-drawer-edge"
      role="button"
      tabindex="0"
      :aria-expanded="drawerOpen"
      aria-label="Toggle drawer"
      @click="toggleDrawer"
      @keydown.enter.prevent="toggleDrawer"
      @keydown.space.prevent="toggleDrawer">
      <v-icon v-if="!drawerOpen">mdi-chevron-left</v-icon>
      <v-icon v-else>mdi-chevron-right</v-icon>
    </div>
    <transition name="sapling-drawer-content">
      <div v-show="drawerOpen" class="sapling-drawer-content" :aria-hidden="!drawerOpen">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import {
  useSaplingDrawer,
  type SaplingDrawerProps,
} from '@/composables/common/useSaplingDrawer';
// #endregion

// #region Props & Emits
const props = withDefaults(defineProps<SaplingDrawerProps>(), {
  width: 380,
  closedPercent: 0.1,
  modelValue: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
// #endregion

// #region Composable
const { drawerOpen, drawerStyle, toggleDrawer } = useSaplingDrawer(props, emit);
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingDrawer.css"></style>