<template>
  <Teleport to="body">
    <Transition name="sapling-header-inbox-preview">
      <div
        v-if="preview"
        :class="[
          'sapling-header__inbox-preview',
          `sapling-header__inbox-preview--${preview.kind}`,
          'glass-panel',
        ]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
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
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SaplingHeaderInboxPreview } from '@/composables/system/useSaplingHeader'

const props = defineProps<{
  preview: SaplingHeaderInboxPreview | null
}>()

const { t } = useI18n()

const inboxLabel = computed(() => t('navigation.inbox'))
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
