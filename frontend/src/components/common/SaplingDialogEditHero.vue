<template>
  <section v-bind="$attrs" class="sapling-dialog-edit-hero">
    <template v-if="loading">
      <slot name="loading">
        <v-skeleton-loader
          class="sapling-dialog-edit-loading__hero"
          elevation="12"
          type="heading, text"
        />
      </slot>
      <div v-if="dialogClose?.close.value" class="sapling-dialog-edit-hero__actions">
        <v-btn
          class="sapling-dialog-hero__close"
          size="small"
          variant="text"
          density="comfortable"
          icon="mdi-close"
          :disabled="dialogClose.disabled.value"
          :aria-label="dialogClose.label.value"
          :title="dialogClose.label.value"
          @click.stop="dialogClose.close.value?.()"
        />
      </div>
    </template>
    <template v-else>
      <div class="sapling-dialog-edit-hero__copy">
        <div v-if="eyebrow" class="sapling-dialog-edit-hero__eyebrow">{{ eyebrow }}</div>

        <div class="sapling-dialog-edit-hero__title-row">
          <component :is="titleTag" class="sapling-dialog-edit-hero__title">{{ title }}</component>
          <div v-if="$slots.timestamps" class="sapling-dialog-edit-hero__timestamps">
            <slot name="timestamps" />
          </div>
        </div>

        <div v-if="$slots.meta" class="sapling-dialog-edit-hero__meta">
          <slot name="meta" />
        </div>
      </div>
      <div
        v-if="$slots.actions || dialogClose?.close.value"
        class="sapling-dialog-edit-hero__actions"
      >
        <slot name="actions" />
        <v-btn
          class="sapling-dialog-hero__close"
          v-if="dialogClose?.close.value"
          size="small"
          variant="text"
          density="comfortable"
          icon="mdi-close"
          :disabled="dialogClose.disabled.value"
          :aria-label="dialogClose.label.value"
          :title="dialogClose.label.value"
          @click.stop="dialogClose.close.value?.()"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { saplingDialogCloseKey } from '@/components/dialog/saplingDialogClose'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    titleTag?: string
    loading?: boolean
  }>(),
  {
    eyebrow: '',
    title: '',
    titleTag: 'h2',
    loading: false,
  },
)

const dialogClose = inject(saplingDialogCloseKey, null)
</script>
