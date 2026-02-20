<template>
  <!-- Application header bar with navigation and actions -->
  <v-app-bar :elevation="2" class="sapling-header">
    <template v-slot:prepend>
      <!-- Navigation drawer toggle button -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <div style="display: flex; align-items: center; gap: 32px;">
        <!-- Home button -->
        <v-btn stacked @click="$router.push('/')">Sapling</v-btn>
        <SaplingAgent />
      </div>
    </v-app-bar-title>

    <template v-slot:append>
      <!-- Current time display -->
      <span style="margin-left: 16px; font-weight: normal;">{{ time }}</span>
      <!-- Inbox button with badge -->
      <v-btn class="text-none" stacked @click="showInbox = true">
        <v-badge location="top right" color="primary" :content="countTasks">
          <v-icon icon="mdi-email"></v-icon>
        </v-badge>
      </v-btn>
      <!-- Account button -->
      <v-btn stacked @click="showAccount = true">
        <div style="display: flex; align-items: center; gap: 8px;">
          <v-icon icon="mdi-account"></v-icon>
          <div>{{ currentPersonStore.person?.firstName }}</div>
        </div>
      </v-btn>
    </template>
  </v-app-bar>

  <!-- Navigation drawer component -->
  <SaplingNavigation v-model="drawer" />

  <!-- Inbox Modal -->
  <v-dialog v-model="showInbox" max-width="90vw" max-height="90vh" scrollable>
    <div style="max-height:80vh; overflow-y:auto;">
      <SaplingInbox @close="showInbox = false" />
    </div>
  </v-dialog>

  <!-- Account Modal -->
  <v-dialog v-model="showAccount" max-width="90vw" max-height="90vh" scrollable>
    <div style="max-height:80vh; overflow-y:auto;">
      <SaplingAccount v-if="showAccount" @close="showAccount = false" />
    </div>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
// Import the composable for managing the header logic
import { useSaplingHeader } from '@/composables/system/useSaplingHeader';
// Import the navigation drawer component
import SaplingNavigation from '@/components/system/SaplingNavigation.vue';
// Import the inbox modal component
import SaplingInbox from '@/components/account/SaplingInbox.vue';
// Import the account modal component
import SaplingAccount from '@/components/account/SaplingAccount.vue';
// Import the agent search component
import SaplingAgent from '@/components/system/SaplingAgent.vue';
// #endregion

// #region Composable
// Destructure the properties and methods from the useSaplingHeader composable
import { ref } from 'vue';
const {
  drawer, // Reactive property for the navigation drawer state
  showInbox, // Reactive property for showing the inbox modal
  countTasks, // Reactive property for the count of open tasks
  time, // Reactive property for the current time
  currentPersonStore, // Store for managing the current person's data
} = useSaplingHeader();
const showAccount = ref(false);
// #endregion

</script>