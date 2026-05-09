<template>
  <!--
    Unified card wrapper for every dialog in Sapling. Centralizes the standard
    glass-panel + tilt-content + TILT_DEFAULT_OPTIONS + elevation pattern so
    callers can keep their templates focused on layout. Additional classes
    passed by the parent are merged via Vue's attribute fallthrough.
  -->
  <v-card
    v-tilt="tilt ? TILT_DEFAULT_OPTIONS : null"
    class="glass-panel tilt-content sapling-dialog-card"
    :elevation="elevation"
  >
    <slot />
  </v-card>
</template>

<script setup lang="ts">
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'

withDefaults(
  defineProps<{
    /** Disable the tilt directive for callers that need a static surface. */
    tilt?: boolean
    /** Card elevation, kept configurable for the few callers that want a softer shadow. */
    elevation?: string | number
  }>(),
  {
    tilt: true,
    elevation: 12,
  },
)
</script>
