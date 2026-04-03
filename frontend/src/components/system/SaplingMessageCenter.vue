<template>
  <div class="messageCenter">
    <!-- Floating Meldungen -->
    <transition-group name="messages-fade" tag="div" class="messages-float">
      <div v-for="message in visibleMessages" :key="message.id" class="message">
        <v-alert :type="message.type" density="comfortable" border="start" class="ma-2">
          <div>
            {{ $t(`navigation.${message.entity}`) + ': ' + $t(message.message) }}
          </div>
          <div v-if="message.description" style="font-size: 0.92em; margin-top:2px;">
            {{ message.description }}
          </div>
        </v-alert>
      </div>
    </transition-group>
    <!-- Dialog for all Meldungen -->
    <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
      <template v-slot:activator="{ props }">
        <slot name="activator" v-bind="props" />
      </template>
      <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
        <v-card-title>{{ $t('global.messageCenter') }}</v-card-title>
        <v-divider />
        <v-card-text>
          <v-list density="comfortable">
            <v-list-item v-for="message in messages" :key="message.id">
              <template #prepend>
                <v-icon :color="getMessageColor(message.type)">{{ getMessageIcon(message.type) }}</v-icon>
              </template>
              <template #title>
                <span :class="message.type">{{ $t(`navigation.${message.entity}`) + ': ' + $t(message.message) }}</span>
                <div v-if="message.description" style="font-size: 0.92em; margin-top:2px;">
                  {{ message.description }}
                </div>
              </template>
              <template #subtitle>
                {{ message.timestamp.toLocaleTimeString() }}
              </template>
              <template #append>
                <v-btn icon="mdi-close" @click="removeMessage(message.id)" variant="text" size="small" />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <SaplingActionDelete
          :handleConfirm="clearAll"
          :handleCancel="closeDialog"
        />
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionDelete from '../actions/SaplingActionDelete.vue';
// #endregion

// #region Composable
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

defineExpose({ dialog, openDialog, closeDialog });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingMessageCenter.css"></style>