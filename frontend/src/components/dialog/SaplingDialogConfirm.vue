<template>
  <!--
    Generic confirmation dialog shell. Wraps the standard glass panel layout, hero,
    optional body and a slot for action buttons. Used by SaplingDialogDelete,
    SaplingDialogUnsavedChanges and other lightweight confirmation prompts.
  -->
  <v-dialog
    :model-value="modelValue"
    :class="dialogClass"
    :persistent="persistent"
    @update:model-value="handleDialogUpdate"
  >
    <v-card
      v-tilt="tilt ? TILT_DEFAULT_OPTIONS : null"
      class="glass-panel"
      :class="cardClass"
      elevation="12"
    >
      <div class="sapling-dialog-shell">
        <template v-if="loading">
          <SaplingDialogHero :variant="variant" loading />
          <div class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-skeleton-loader type="button" width="112" />
              <v-spacer />
              <v-skeleton-loader type="button" width="112" />
            </v-card-actions>
          </div>
        </template>
        <template v-else>
          <SaplingDialogHero
            :variant="variant"
            :eyebrow="eyebrow"
            :title="title"
            :subtitle="subtitle"
          >
            <template v-if="$slots['hero-meta']" #meta>
              <slot name="hero-meta" />
            </template>
          </SaplingDialogHero>
          <v-card-text v-if="$slots.body" class="sapling-dialog__body">
            <slot name="body" />
          </v-card-text>
          <slot name="actions" />
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'

// #region Props & Emits
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    eyebrow?: string
    title?: string
    subtitle?: string
    variant?: 'default' | 'danger'
    loading?: boolean
    persistent?: boolean
    tilt?: boolean
    size?: 'small' | 'medium' | 'large'
    cardClass?: string | string[] | Record<string, boolean>
  }>(),
  {
    eyebrow: '',
    title: '',
    subtitle: '',
    variant: 'default',
    loading: false,
    persistent: true,
    tilt: true,
    size: 'medium',
    cardClass: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
// #endregion

// #region Computed
const dialogClass = computed(() => `sapling-dialog-${props.size}`)
// #endregion

// #region Methods
function handleDialogUpdate(value: boolean): void {
  emit('update:modelValue', value)
}
// #endregion
</script>
