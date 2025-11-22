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
        <!-- Central search field ausgelagert -->
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
      <v-btn stacked @click="$router.push('/account')">
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
</template>

<script lang="ts" setup>
// #region Imports
// Import the composable for managing the header logic
import { useSaplingHeader } from '@/composables/useSaplingHeader';
// Import the navigation drawer component
import SaplingNavigation from './SaplingNavigation.vue';
// Import the inbox modal component
import SaplingInbox from './SaplingInbox.vue';
import { computed, ref, watch } from 'vue';
// Import the API service
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';
import SaplingAgent from './SaplingAgent.vue';
// #endregion

// #region Composable
// Destructure the properties and methods from the useSaplingHeader composable
const {
  searchQuery, // Reactive property for the search query input
  drawer, // Reactive property for the navigation drawer state
  showInbox, // Reactive property for showing the inbox modal
  countTasks, // Reactive property for the count of open tasks
  time, // Reactive property for the current time
  currentPersonStore, // Store for managing the current person's data
  onSearch, // Method to handle the search action
} = useSaplingHeader();
// #endregion

// #region Refs
const searchMenu = ref(false);
const selectedEntity = ref(null);
const entities = ref<EntityItem[]>([]);

// Entity-Auswahl für v-select
const entityOptions = computed(() =>
  entities.value.map(e => ({
    title: e.handle,
    value: e.handle,
    icon: e.icon
  }))
);

// Entities laden, wenn Menü geöffnet wird
watch(searchMenu, async (val) => {
  if (val) {
    try {
      const result = await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } });
      entities.value = result.data;
    } catch (e) {
      // Fehlerbehandlung nach Bedarf
      entities.value = [];
    }
  }
});
// #endregion
</script>