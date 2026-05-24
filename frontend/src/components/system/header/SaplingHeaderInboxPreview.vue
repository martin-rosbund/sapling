<template>
  <Teleport to="body">
    <Transition name="sapling-header-inbox-preview">
      <SaplingSurface
        as="button"
        v-if="preview"
        :class="[
          'sapling-header__inbox-preview',
          `sapling-header__inbox-preview--${preview.kind}`,
        ]"
        type="button"
        aria-live="polite"
        aria-atomic="true"
        :aria-label="openLabel"
        @click="emit('open', preview)"
      >
        <div class="sapling-header__inbox-preview-icon">
          <v-icon :icon="preview.icon" size="22" />
        </div>
        <div class="sapling-header__inbox-preview-copy">
          <div class="sapling-header__inbox-preview-meta">
            <div class="sapling-header__inbox-preview-label">{{ inboxLabel }}</div>
            <div class="sapling-header__inbox-preview-kind">
              {{ kindLabel }}
            </div>
          </div>
          <div class="sapling-header__inbox-preview-title">
            {{ preview.title }}
          </div>
        </div>
      </SaplingSurface>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import type { SaplingHeaderInboxPreview } from '@/composables/system/useSaplingHeader'

const props = defineProps<{
  preview: SaplingHeaderInboxPreview | null
}>()

const emit = defineEmits<{
  (event: 'open', preview: SaplingHeaderInboxPreview): void
}>()

const { t } = useI18n()

const inboxLabel = computed(() => t('navigation.inbox'))
const openLabel = computed(() => {
  if (!props.preview) {
    return t('navigation.inbox')
  }

  return `${t('navigation.inbox')}: ${props.preview.title}`
})
const kindLabel = computed(() => {
  if (!props.preview) {
    return ''
  }

  switch (props.preview.kind) {
    case 'ticket':
      return t('navigation.ticket')
    case 'event':
      return t('navigation.event')
    case 'salesOpportunity':
      return t('navigation.salesOpportunity')
    case 'notification':
    default:
      return t('navigation.inboxNotification')
  }
})
</script>
