<template>
  <!-- Application header bar with navigation and actions -->
  <v-app-bar :elevation="2">
    <template v-slot:prepend>
      <!-- Navigation drawer toggle button -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <div style="display: flex; align-items: center; gap: 32px;">
        <!-- Home button -->
        <v-btn stacked @click="$router.push('/')">Sapling</v-btn>
        <!-- Zentrales Suchfeld -->
        <v-text-field
          v-model="searchQuery"
          placeholder=""
          hide-details
          density="compact"
          style="max-width: 1600px; vertical-align: middle;"
          @keydown.enter="onSearch"
          prepend-inner-icon="mdi-face-agent"
        />
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
      <v-btn stacked @click="$router.push('/account')">
        <v-icon icon="mdi-account"></v-icon>
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
</template>

<script lang="ts" setup> 
// #region Imports
import { useSaplingHeader } from '@/composables/useSaplingHeader';
import SaplingNavigation from './SaplingNavigation.vue';
import SaplingInbox from './SaplingInbox.vue';
// #endregion

// #region Composable
const {
  searchQuery,
  drawer,
  showInbox,
  countTasks,
  time,
  onSearch,
  countOpenTasks,
} = useSaplingHeader();
// #endregion

</script>