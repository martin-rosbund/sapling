<template>
  <section v-bind="$attrs" class="sapling-dialog-edit-hero">
    <template v-if="loading">
      <slot name="loading">
        <v-skeleton-loader class="sapling-dialog-edit-loading__hero" elevation="12" type="heading, text" />
      </slot>
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


      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

withDefaults(defineProps<{
  eyebrow?: string;
  title?: string;
  titleTag?: string;
  loading?: boolean;
}>(), {
  eyebrow: '',
  title: '',
  titleTag: 'h2',
  loading: false,
});
</script>

<style scoped src="@/assets/styles/SaplingHero.css"></style>