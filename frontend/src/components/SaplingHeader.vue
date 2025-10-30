<template>
  <!-- Application header bar with navigation and actions -->
  <v-app-bar :elevation="2">
    <template v-slot:prepend>
      <!-- Navigation drawer toggle button -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <!-- Home button -->
      <v-btn stacked @click="$router.push('/')">Startseite</v-btn>
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
// Import required modules and components
import { ref, onMounted, onUnmounted } from 'vue'
import SaplingNavigation from './SaplingNavigation.vue'
import SaplingInbox from './SaplingInbox.vue' // Inbox component
import ApiService from '@/services/api.service'

// Drawer open/close state
const drawer = ref(false)
// Inbox dialog state
const showInbox = ref(false)
// Number of open tasks
const countTasks = ref(0)

// Current time state
const time = ref(new Date().toLocaleTimeString())
let timerClock: number
let timerTasks: number

async function countOpenTasks() {
  countTasks.value = (await ApiService.findAll<{ count: number }>('current/countOpenTasks')).count;
}

// Start timer to update time every second
onMounted(() => {
  countOpenTasks();

  timerClock = window.setInterval(() => {
    time.value = new Date().toLocaleTimeString()
  }, 1000)
  
  timerTasks = window.setInterval(() => {
    countOpenTasks();
  }, 10000)
})

// Clear timer on component unmount
onUnmounted(() => {
  clearInterval(timerClock)
  clearInterval(timerTasks)
})
</script>