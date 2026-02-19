<template>
  <div class="messageCenter">
    <!-- Floating Meldungen -->
    <transition-group name="messages-fade" tag="div" class="messages-float">
      <div v-for="message in messages.filter(m => !m.hidden).slice(0,3)" :key="message.id" :class="['message', message.type]">
        <v-alert :type="message.type" dense border="start" class="ma-2">
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
          <v-list dense class="transparent">
            <v-list-item v-for="message in messages" :key="message.id">
              <template #prepend>
                <v-icon :color="message.type === 'error' ? 'error' : (message.type === 'success' ? 'success' : (message.type === 'warning' ? 'warning' : 'info'))">
                  {{
                    message.type === 'error' ? 'mdi-alert-circle' :
                    message.type === 'success' ? 'mdi-check-circle' :
                    message.type === 'warning' ? 'mdi-alert' :
                    'mdi-information'
                  }}
                </v-icon>
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
          <sapling-delete-action
            :handleConfirm="clearAll"
            :handleCancel="() => dialog = false"
          />
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useMessageCenter } from '@/composables/system/useMessageCenter';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingDeleteAction from '../actions/SaplingDeleteAction.vue';

const dialog = ref(false);
const { messages, removeMessage, clearAll } = useMessageCenter();

defineExpose({ dialog });
</script>

<style scoped>
.messages-float {
  position: fixed;
  bottom: 64px;
  left: 24px;
  right: 24px;
  width: calc(100vw - 48px);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: none;
}
.message {
  width: 100%;
  margin-bottom: 8px;
  pointer-events: auto;
}
.message.error .v-alert { background: #ffebee; }
.message.info .v-alert { background: #e3f2fd; }
.message.success .v-alert { background: #e8f5e9; }
.message.warning .v-alert { background: #fffde7; }
</style>
