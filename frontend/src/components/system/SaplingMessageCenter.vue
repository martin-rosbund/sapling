<template>
  <div class="messageCenter">
    <Teleport to="body">
      <!-- Floating Meldungen -->
      <transition-group name="messages-fade" tag="div" class="messages-float">
        <div
          v-for="message in visibleMessages"
          :key="message.id"
          class="message"
          role="button"
          tabindex="0"
          @click="hideMessage(message.id)"
          @keydown.enter.prevent="hideMessage(message.id)"
          @keydown.space.prevent="hideMessage(message.id)"
        >
          <v-alert :type="message.type" density="comfortable" border="start" class="ma-2">
            <template v-if="isTranslationLoading">
              <v-skeleton-loader type="text, text" />
            </template>
            <template v-else>
              <div class="message__title-row">
                <span>{{ formatMessageLabel(message) }}</span>
                <v-chip v-if="message.count > 1" size="x-small" variant="tonal">
                  {{ message.count }}x
                </v-chip>
              </div>
              <div v-if="message.description" class="message__description">
                {{ formatMessageDescription(message.description) }}
              </div>
            </template>
          </v-alert>
        </div>
      </transition-group>
    </Teleport>
    <!-- Dialog for all Meldungen -->
    <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
      <template v-slot:activator="{ props }">
        <slot name="activator" v-bind="props" />
      </template>
      <SaplingDialogCard class="sapling-message-center-dialog" :tilt="false">
        <div class="sapling-dialog-shell sapling-fill-shell">
          <template v-if="isTranslationLoading">
            <SaplingDialogHero loading />
            <div class="sapling-message-center-dialog__body">
              <SaplingSurface :as="VSkeletonLoader" type="article, article, article" />
            </div>
            <SaplingActionBarSkeleton />
          </template>
          <template v-else>
            <SaplingDialogHero
              :eyebrow="$t('global.messageCenter')"
              :title="$t('global.messageCenter')"
            />

            <div class="sapling-message-center-dialog__body">
              <SaplingSurface
                as="section"
                v-if="messages.length === 0"
                class="sapling-empty-state-panel sapling-empty-state-panel--large"
              >
                <div class="sapling-empty-state-panel__icon">
                  <v-icon icon="mdi-bell-check-outline" size="40" />
                </div>
                <h3 class="sapling-empty-state-panel__title">
                  {{ $t('global.messageCenter') }}
                </h3>
              </SaplingSurface>

              <v-list
                v-else
                density="comfortable"
                class="sapling-section-stack sapling-section-stack--md sapling-message-center-list"
              >
                <v-list-item
                  v-for="message in messages"
                  :key="message.id"
                  class="sapling-panel-shell-muted sapling-message-center-entry"
                >
                  <template #prepend>
                    <div class="sapling-icon-tile sapling-icon-tile--sm">
                      <v-icon :color="getMessageColor(message.type)">{{
                        getMessageIcon(message.type)
                      }}</v-icon>
                    </div>
                  </template>
                  <template #title>
                    <span :class="message.type">
                      {{ formatMessageLabel(message) }}
                      <v-chip v-if="message.count > 1" size="x-small" variant="tonal" class="ml-2">
                        {{ message.count }}x
                      </v-chip>
                    </span>
                    <div
                      v-if="message.description"
                      class="sapling-message-center-entry__description"
                    >
                      {{ formatMessageDescription(message.description) }}
                    </div>
                  </template>
                  <template #subtitle>
                    {{ formatTimestamp(message.timestamp) }}
                  </template>
                  <template #append>
                    <v-btn
                      icon="mdi-close"
                      @click="removeMessage(message.id)"
                      variant="text"
                      size="small"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <SaplingActionMessageCenter
              :close="closeDialog"
              :export-messages="exportMessages"
              :clear-all="clearAll"
              :empty="messages.length === 0"
            />
          </template>
        </div>
      </SaplingDialogCard>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useI18n } from 'vue-i18n'
import { VSkeletonLoader } from 'vuetify/components'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import type { Message } from '@/composables/system/useSaplingMessageCenter'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingActionBarSkeleton from '@/components/actions/SaplingActionBarSkeleton.vue'
import SaplingActionMessageCenter from '@/components/actions/SaplingActionMessageCenter.vue'
// #endregion

// #region Composable
const { t, te } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader(
  'global',
  'navigation',
  'login',
  'exception',
  'aiEntityGeneration',
)

const {
  dialog,
  messages,
  visibleMessages,
  hideMessage,
  removeMessage,
  clearAll,
  openDialog,
  closeDialog,
  getMessageIcon,
  getMessageColor,
} = useSaplingMessageCenter()

function formatMessageLabel(message: Message) {
  const entityLabel = getEntityLabel(message.entity)
  const messageLabel = te(message.message) ? t(message.message) : message.message

  return `${entityLabel}: ${messageLabel}`
}

function getEntityLabel(entity: string) {
  const navigationKey = `navigation.${entity}`
  if (te(navigationKey)) {
    return t(navigationKey)
  }

  const titleKey = `${entity}.title`
  if (te(titleKey)) {
    return t(titleKey)
  }

  const globalKey = `global.${entity}`
  if (te(globalKey)) {
    return t(globalKey)
  }

  return entity
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatMessageDescription(description: string) {
  return te(description) ? t(description) : description
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleTimeString()
}

function exportMessages() {
  if (messages.value.length === 0) {
    return
  }

  const exportPayload = {
    source: 'sapling-log-message-center',
    exportedAt: new Date().toISOString(),
    messages: messages.value.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
  }

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = createExportFilename()
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function createExportFilename() {
  const now = new Date()
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ]

  return `sapling-log-${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}-${parts[5]}.json`
}

defineExpose({ dialog, openDialog, closeDialog })
// #endregion
</script>
