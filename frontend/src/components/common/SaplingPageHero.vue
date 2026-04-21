<template>
  <section
    v-bind="$attrs"
    class="sapling-page-hero glass-panel"
    :class="[`sapling-page-hero--${variant}`, { 'sapling-page-hero--copy-only': !$slots.side }]"
  >
    <div class="sapling-page-hero__copy">
      <p v-if="eyebrow" class="sapling-page-hero__eyebrow">{{ eyebrow }}</p>

      <div class="sapling-page-hero__title-row">
        <div v-if="$slots['title-prefix']" class="sapling-page-hero__title-prefix">
          <slot name="title-prefix" />
        </div>

        <div class="sapling-page-hero__title-copy">
          <component :is="titleTag" class="sapling-page-hero__title">{{ title }}</component>
          <p v-if="subtitle" class="sapling-page-hero__subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <div v-if="$slots.meta" class="sapling-page-hero__meta">
        <slot name="meta" />
      </div>

      <div v-if="$slots.default" class="sapling-page-hero__body">
        <slot />
      </div>
    </div>

    <div v-if="$slots.side" class="sapling-page-hero__side">
      <slot name="side" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    subtitle?: string
    titleTag?: string
    variant?: 'default' | 'workspace' | 'calendar' | 'system' | 'signal'
  }>(),
  {
    eyebrow: '',
    subtitle: '',
    titleTag: 'h1',
    variant: 'default',
  },
)
</script>
