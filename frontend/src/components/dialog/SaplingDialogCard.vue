<template>
  <SaplingSurface
    v-bind="$attrs"
    :as="VCard"
    class="sapling-dialog-card"
    :tilt="tilt"
    :elevation="elevation"
  >
    <slot />
  </SaplingSurface>
</template>

<script setup lang="ts">
import { VCard } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'

defineOptions({
  inheritAttrs: false,
})

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
