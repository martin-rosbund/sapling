<template>
  <!-- Application header bar with navigation and actions -->
  <v-app-bar :elevation="2" class="sapling-header">
    <template #prepend>
      <!-- Navigation drawer toggle button -->
      <v-app-bar-nav-icon @click="toggleNavigation"></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <div style="display: flex; align-items: center; gap: 32px;">
        <!-- Home button -->
        <v-btn stacked @click="goHome">Sapling</v-btn>
        <SaplingAgent v-if="props.showAgent" />
      </div>
    </v-app-bar-title>

    <template #append>
      <!-- Current time display -->
      <span style="margin-left: 16px; font-weight: normal;">{{ time }}</span>

      <!-- Inbox button with badge -->
      <v-btn class="text-none" stacked @click="openInbox">
        <v-badge location="top right" color="primary" :content="inboxCount">
          <v-icon icon="mdi-email"></v-icon>
        </v-badge>
      </v-btn>

      <!-- Account button -->
      <v-btn stacked @click="openAccount">
        <div style="display: flex; align-items: center; gap: 8px;">
          <v-icon icon="mdi-account"></v-icon>
          <div>{{ currentPersonStore.person?.firstName }}</div>
        </div>
      </v-btn>
    </template>
  </v-app-bar>

  <!-- Inbox dialog -->
  <SaplingInbox v-if="showInbox" @close="closeInbox" />

  <!-- Account dialog -->
  <SaplingAccount v-if="showAccount" @close="closeAccount" />
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingHeader } from '@/composables/system/useSaplingHeader';
import SaplingInbox from '@/components/account/SaplingInbox.vue';
import SaplingAccount from '@/components/account/SaplingAccount.vue';
import SaplingAgent from '@/components/system/SaplingAgent.vue';
// #endregion

// #region Props
const props = withDefaults(defineProps<{
  showAgent?: boolean;
  modelValue?: boolean;
}>(), {
  showAgent: false,
  modelValue: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
// #endregion

function toggleNavigation() {
  emit('update:modelValue', !props.modelValue);
}

// #region Composable
const {
  showInbox,
  showAccount,
  inboxCount,
  time,
  currentPersonStore,
  openInbox,
  closeInbox,
  openAccount,
  closeAccount,
  goHome,
} = useSaplingHeader();
// #endregion

</script>