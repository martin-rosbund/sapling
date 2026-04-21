<template>
  <div class="messageCenter">
    <!-- Floating Meldungen -->
    <transition-group name="messages-fade" tag="div" class="messages-float">
      <div v-for="message in visibleMessages" :key="message.id" class="message">
        <v-alert :type="message.type" density="comfortable" border="start" class="ma-2">
          <template v-if="isTranslationLoading">
            <v-skeleton-loader type="text, text" />
          </template>
          <template v-else>
            <div>
              {{ formatMessageLabel(message) }}
            </div>
            <div v-if="message.description" class="message__description">
              {{ formatMessageDescription(message.description) }}
            </div>
          </template>
        </v-alert>
      </div>
    </transition-group>
    <!-- Dialog for all Meldungen -->
    <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
      <template v-slot:activator="{ props }">
        <slot name="activator" v-bind="props" />
      </template>
      <v-card
        class="glass-panel tilt-content sapling-message-center-dialog"
        v-tilt="TILT_DEFAULT_OPTIONS"
        elevation="12"
      >
        <div class="sapling-dialog-shell sapling-fill-shell">
          <template v-if="isTranslationLoading">
            <SaplingDialogHero loading />
            <div class="sapling-message-center-dialog__body">
              <v-skeleton-loader class="glass-panel" type="article, article, article" />
            </div>
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
              :eyebrow="$t('global.messageCenter')"
              :title="$t('global.messageCenter')"
            />

            <div class="sapling-message-center-dialog__body">
              <section
                v-if="messages.length === 0"
                class="sapling-message-center-empty-state glass-panel"
              >
                <div class="sapling-message-center-empty-state__icon">
                  <v-icon icon="mdi-bell-check-outline" size="40" />
                </div>
                <h3 class="sapling-message-center-empty-state__title">
                  {{ $t('global.messageCenter') }}
                </h3>
              </section>

              <v-list v-else density="comfortable" class="sapling-message-center-list">
                <v-list-item
                  v-for="message in messages"
                  :key="message.id"
                  class="sapling-message-center-entry"
                >
                  <template #prepend>
                    <div class="sapling-message-center-entry__icon-wrap">
                      <v-icon :color="getMessageColor(message.type)">{{
                        getMessageIcon(message.type)
                      }}</v-icon>
                    </div>
                  </template>
                  <template #title>
                    <span :class="message.type">{{ formatMessageLabel(message) }}</span>
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
            <SaplingActionDelete :handleConfirm="clearAll" :handleCancel="closeDialog" />
          </template>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useI18n } from 'vue-i18n'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import type { Message } from '@/composables/system/useSaplingMessageCenter'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingActionDelete from '../actions/SaplingActionDelete.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
// #endregion

// #region Composable
const { t, te } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'navigation')

const {
  dialog,
  messages,
  visibleMessages,
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

defineExpose({ dialog, openDialog, closeDialog })
// #endregion
</script>
