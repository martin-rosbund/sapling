<template>
  <div class="messageCenter">
    <!-- Floating Meldungen -->
    <transition-group name="messages-fade" tag="div" class="messages-float">
      <div v-for="message in visibleMessages" :key="message.id" class="message">
        <v-alert :type="message.type" density="comfortable" border="start" class="ma-2">
          <div>
            {{ formatMessageLabel(message) }}
          </div>
          <div v-if="message.description" class="message__description">
            {{ formatMessageDescription(message.description) }}
          </div>
        </v-alert>
      </div>
    </transition-group>
    <!-- Dialog for all Meldungen -->
    <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
      <template v-slot:activator="{ props }">
        <slot name="activator" v-bind="props" />
      </template>
      <v-card class="glass-panel tilt-content sapling-message-center-dialog" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
        <div class="sapling-dialog-shell sapling-fill-shell">
          <SaplingDialogHero :eyebrow="$t('global.messageCenter')" :title="$t('global.messageCenter')" />

          <div class="sapling-message-center-dialog__body">
            <section v-if="messages.length === 0" class="sapling-message-center-empty-state glass-panel">
              <div class="sapling-message-center-empty-state__icon">
                <v-icon icon="mdi-bell-check-outline" size="40" />
              </div>
              <h3 class="sapling-message-center-empty-state__title">{{ $t('global.messageCenter') }}</h3>
            </section>

            <v-list v-else density="comfortable" class="sapling-message-center-list">
              <v-list-item v-for="message in messages" :key="message.id" class="sapling-message-center-entry">
                <template #prepend>
                  <div class="sapling-message-center-entry__icon-wrap">
                    <v-icon :color="getMessageColor(message.type)">{{ getMessageIcon(message.type) }}</v-icon>
                  </div>
                </template>
                <template #title>
                  <span :class="message.type">{{ formatMessageLabel(message) }}</span>
                  <div v-if="message.description" class="sapling-message-center-entry__description">
                    {{ formatMessageDescription(message.description) }}
                  </div>
                </template>
                <template #subtitle>
                  {{ formatTimestamp(message.timestamp) }}
                </template>
                <template #append>
                  <v-btn icon="mdi-close" @click="removeMessage(message.id)" variant="text" size="small" />
                </template>
              </v-list-item>
            </v-list>
          </div>

          <v-divider class="my-2" />
        <SaplingActionDelete
          :handleConfirm="clearAll"
          :handleCancel="closeDialog"
        />
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useI18n } from 'vue-i18n';
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter';
import type { Message } from '@/composables/system/useSaplingMessageCenter';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionDelete from '../actions/SaplingActionDelete.vue';
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue';
// #endregion

// #region Composable
const { t, te } = useI18n();

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
} = useSaplingMessageCenter();

function formatMessageLabel(message: Message) {
  return `${t(`navigation.${message.entity}`)}: ${t(message.message)}`;
}

function formatMessageDescription(description: string) {
  return te(description) ? t(description) : description;
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleTimeString();
}

defineExpose({ dialog, openDialog, closeDialog });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingMessageCenter.css"></style>
<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>