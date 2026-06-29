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
import { computed, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import { VCard } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import { saplingDialogCloseKey } from '@/components/dialog/saplingDialogClose'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Disable the tilt directive for callers that need a static surface. */
    tilt?: boolean
    /** Card elevation, kept configurable for the few callers that want a softer shadow. */
    elevation?: string | number
    /** Optional top-right close action. Should use the same handler as the dialog footer close/cancel. */
    close?: () => void
    closeDisabled?: boolean
    closeLabel?: string
  }>(),
  {
    tilt: true,
    elevation: 12,
    close: undefined,
    closeDisabled: false,
    closeLabel: undefined,
  },
)

const { t } = useI18n()
const closeAction = computed(() => props.close)
const closeLabel = computed(() => props.closeLabel ?? t('global.close'))
const closeDisabled = computed(() => props.closeDisabled)

provide(saplingDialogCloseKey, {
  close: closeAction,
  disabled: closeDisabled,
  label: closeLabel,
})
</script>
