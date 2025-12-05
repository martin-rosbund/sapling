<template>
  <!-- Skeleton loader displayed while loading -->
  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto glass-panel"
    elevation="12"
    type="article, actions"/>
  <template v-else>
    <!-- Dialog container for the inbox -->
    <v-dialog v-if="dialog" v-model="dialog" persistent max-width="1200px">
      <v-card class="glass-panel tilt-content" v-tilt="TILT_SOFT_OPTIONS" elevation="12">
        <!-- Title of the inbox dialog -->
        <v-card-title class="text-white">{{ $t('navigation.inbox') }}</v-card-title>
        <v-card-text style="overflow-y: visible;">
          <v-row>
            <!-- Column for today's tickets and tasks -->
            <v-col cols="12" md="6">
              <v-card class="glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12" style="max-height: 600px; overflow-y: auto;">
                <v-card-title class="text-white">{{ $t('inbox.today') }}</v-card-title>
                <v-divider></v-divider>
                <!-- List of today's tickets -->
                <v-list class="transparent">
                  <v-list-subheader>{{ $t('navigation.ticket') }}</v-list-subheader>
                  <template v-for="ticket in todayTickets" :key="'ticket-' + ticket.handle">
                    <v-list-item>
                      <div class="sapling-inbox-date">{{ formatDate(ticket.deadlineDate) }}</div>
                      <div class="sapling-inbox-title">{{ ticket.title }}</div>
                      <div class="sapling-inbox-subtitle">{{ ticket.problemDescription }}</div>
                      <template #append>
                        <v-btn :to="getTicketLink(ticket)" icon color="primary" size="small">
                          <v-icon>mdi-arrow-right</v-icon>
                        </v-btn>
                      </template>
                    </v-list-item>
                    <v-divider></v-divider>
                  </template>
                </v-list>
                <!-- List of today's tasks -->
                <v-list class="transparent">
                  <v-list-subheader>{{ $t('navigation.event') }}</v-list-subheader>
                  <template v-for="task in todayTasks" :key="'task-' + task.handle">
                    <v-list-item>
                      <div class="sapling-inbox-date">{{ formatDateFromTo(task.startDate, task.endDate) }}</div>
                      <div class="sapling-inbox-title">{{ task.title }}</div>
                      <div class="sapling-inbox-subtitle">{{ task.description }}</div>
                      <template #append>
                        <v-btn :to="getTaskLink(task)" icon color="primary" size="small">
                          <v-icon>mdi-arrow-right</v-icon>
                        </v-btn>
                      </template>
                    </v-list-item>
                    <v-divider></v-divider>
                  </template>
                </v-list>
              </v-card>
            </v-col>
            <!-- Column for expired tickets and tasks -->
            <v-col cols="12" md="6">
              <v-card class="glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12" style="max-height: 600px; overflow-y: auto;">
                <v-card-title class="text-white">{{ $t('inbox.expired') }}</v-card-title>
                <v-divider></v-divider>
                <!-- List of expired tickets -->
                <v-list class="transparent">
                  <v-list-subheader>{{ $t('navigation.ticket') }}</v-list-subheader>
                  <template v-for="ticket in expiredTickets" :key="'ticket-' + ticket.handle">
                    <v-list-item>
                      <div class="sapling-inbox-date">{{ formatDate(ticket.deadlineDate) }}</div>
                      <div class="sapling-inbox-title">{{ ticket.title }}</div>
                      <div class="sapling-inbox-subtitle">{{ ticket.problemDescription }}</div>
                      <template #append>
                        <v-btn :to="getTicketLink(ticket)" icon color="primary" size="small">
                          <v-icon>mdi-arrow-right</v-icon>
                        </v-btn>
                      </template>
                    </v-list-item>
                    <v-divider></v-divider>
                  </template>
                </v-list>
                <!-- List of expired tasks -->
                <v-list class="transparent">
                  <v-list-subheader>{{ $t('navigation.event') }}</v-list-subheader>
                  <template v-for="task in expiredTasks" :key="'task-' + task.handle">
                    <v-list-item>
                      <div class="sapling-inbox-date">{{ formatDateFromTo(task.startDate, task.endDate) }}</div>
                      <div class="sapling-inbox-title">{{ task.title }}</div>
                      <div class="sapling-inbox-subtitle">{{ task.description }}</div>
                      <template #append>
                        <v-btn :to="getTaskLink(task)" icon color="primary" size="small">
                          <v-icon>mdi-arrow-right</v-icon>
                        </v-btn>
                      </template>
                    </v-list-item>
                    <v-divider></v-divider>
                  </template>
                </v-list>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <!-- Actions for the inbox dialog -->
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="closeDialog">{{ $t('global.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
</template>

<script setup lang="ts">
  //#region Import
  // Import the CSS file for styling the inbox component
  import '@/assets/styles/SaplingInbox.css';
  // Import the composable for handling inbox logic
  import { useSaplingInbox } from '@/composables/account/useSaplingInbox';
  // Import utility functions for date formatting
  import { formatDate, formatDateFromTo } from '@/utils/saplingFormatUtil';
  // Import tilt effect options for the inbox dialog
  import { TILT_DEFAULT_OPTIONS, TILT_SOFT_OPTIONS } from '@/constants/tilt.constants';
  //#endregion

  //#region Composable
  // Define the emitted events for the component
  const emit = defineEmits(['close']);

  // Destructure the properties and methods from the useSaplingInbox composable
  const {
    isLoading, // Reactive property indicating if the inbox data is loading
    dialog, // Reactive property to control the visibility of the inbox dialog
    todayTickets, // Reactive property for today's tickets
    expiredTickets, // Reactive property for expired tickets
    todayTasks, // Reactive property for today's tasks
    expiredTasks, // Reactive property for expired tasks
    getTicketLink, // Utility function to generate ticket links
    getTaskLink, // Utility function to generate task links
    closeDialog, // Method to close the inbox dialog
  } = useSaplingInbox(emit);
//#endregion
</script>