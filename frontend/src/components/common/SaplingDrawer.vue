<template>
  <div
    class="sapling-navigation-drawer-anchor"
    :style="drawerAnchorStyle"
    @mouseleave="hideDrawerEdge"
    @keydown.esc.prevent="closeDrawer"
  >
    <div class="sapling-drawer-hotspot" @mouseenter="showDrawerEdge"></div>
    <div
      class="sapling-navigation-drawer"
      :class="{
        'sapling-drawer-open': drawerOpen,
        'sapling-drawer-closed': !drawerOpen,
        'sapling-drawer-edge-visible': drawerEdgeVisible,
      }"
      :style="drawerStyle"
      @mouseenter="showDrawerEdge"
      @focusin="showDrawerEdge"
      @focusout="handleFocusOut"
    >
      <div
        class="sapling-drawer-edge"
        role="button"
        tabindex="0"
        :aria-expanded="drawerOpen"
        :aria-label="drawerOpen ? 'Close drawer' : 'Open drawer'"
        @click="toggleDrawer"
        @focus="showDrawerEdge"
        @keydown.enter.prevent="toggleDrawer"
        @keydown.space.prevent="toggleDrawer"
      >
        <v-icon v-if="!drawerOpen">mdi-chevron-left</v-icon>
        <v-icon v-else>mdi-chevron-right</v-icon>
      </div>
      <div v-show="drawerOpen" class="sapling-drawer-content" :aria-hidden="!drawerOpen">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingDrawer, type SaplingDrawerProps } from '@/composables/common/useSaplingDrawer'
// #endregion

// #region Props & Emits
const props = withDefaults(defineProps<SaplingDrawerProps>(), {
  width: 380,
  modelValue: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
// #endregion

// #region Composable
const {
  drawerOpen,
  drawerEdgeVisible,
  drawerAnchorStyle,
  drawerStyle,
  closeDrawer,
  toggleDrawer,
  showDrawerEdge,
  hideDrawerEdge,
  handleFocusOut,
} = useSaplingDrawer(props, emit)
// #endregion
</script>
