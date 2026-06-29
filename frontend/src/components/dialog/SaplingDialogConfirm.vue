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
    <SaplingDialogCard
      :tilt="tilt"
      :class="cardClass"
      :close="handleCloseButton"
      :close-disabled="closeDisabled"
    >
      <div class="sapling-dialog-shell" @keydown="onShellKeydown" tabindex="-1">
        <template v-if="loading">
          <SaplingDialogHero :variant="variant" loading />
          <SaplingActionBarSkeleton />
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
    </SaplingDialogCard>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingActionBarSkeleton from '@/components/actions/SaplingActionBarSkeleton.vue'

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
    closeDisabled?: boolean
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
    closeDisabled: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'enter'): void
  (event: 'escape'): void
}>()
// #endregion

// #region Computed
const dialogClass = computed(() => `sapling-dialog-${props.size}`)
// #endregion

// #region Methods
function handleDialogUpdate(value: boolean): void {
  emit('update:modelValue', value)
}

function handleCloseButton(): void {
  emit('escape')
}

/**
 * Forwards keyboard intents so consumers can wire Enter/Escape to their
 * primary and cancel actions without duplicating the listener boilerplate.
 */
function onShellKeydown(event: KeyboardEvent): void {
  if (event.repeat) {
    return
  }

  const target = event.target as HTMLElement | null
  const isEditable =
    target?.tagName === 'TEXTAREA' ||
    (target?.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'checkbox') ||
    target?.isContentEditable === true

  if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !isEditable) {
    event.preventDefault()
    emit('enter')
    return
  }

  if (event.key === 'Escape' && !event.altKey) {
    event.preventDefault()
    emit('escape')
  }
}
// #endregion
</script>
