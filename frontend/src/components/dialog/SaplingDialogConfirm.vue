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
    <SaplingDialogCard :tilt="tilt" :class="cardClass">
      <div class="sapling-dialog-shell">
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
