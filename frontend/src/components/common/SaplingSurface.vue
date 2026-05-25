<template>
  <component
    :is="as"
    v-bind="$attrs"
    v-tilt="resolvedTiltOptions"
    class="sapling-surface"
    :class="surfaceClasses"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { TiltOptions } from 'vanilla-tilt'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: string | Component
    glass?: boolean
    tilt?: boolean
    interactive?: boolean
    variant?: 'glass' | 'solid' | 'subtle' | 'plain'
    tiltOptions?: TiltOptions
  }>(),
  {
    as: 'div',
    glass: true,
    tilt: false,
    interactive: false,
    variant: 'glass',
    tiltOptions: () => TILT_DEFAULT_OPTIONS,
  },
)

const resolvedTiltOptions = computed(() => (props.tilt ? props.tiltOptions : null))

const surfaceClasses = computed(() => ({
  'glass-panel': props.glass && props.variant === 'glass',
  'tilt-content': props.tilt,
  'sapling-surface--interactive': props.interactive,
  [`sapling-surface--${props.variant}`]: true,
}))
</script>
