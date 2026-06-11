<template>
  <span v-if="hasTranslation">{{ t(translationKey) }}</span>
  <span
    v-else
    class="sapling-translation-skeleton"
    :style="{ '--sapling-translation-skeleton-width': skeletonWidth }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    translationKey: string
    skeletonWidth?: string
  }>(),
  {
    skeletonWidth: '7rem',
  },
)

const { t, te } = useI18n()

const hasTranslation = computed(() => te(props.translationKey))
</script>
