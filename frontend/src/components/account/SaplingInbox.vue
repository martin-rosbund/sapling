<template>
    <!-- Dialog container for the inbox -->
    <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
        <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_SOFT_OPTIONS" elevation="12" style="height: 100%; height: 80vh; display: flex; flex-direction: column;">
          <!-- Skeleton loader displayed while loading -->
          <v-skeleton-loader
            v-if="isLoading"
            class="mx-auto sapling-skeleton-fullheight"
            elevation="12"
            type="article, table, actions"/>
          <template v-else>
          <!-- Title of the inbox dialog -->
          <v-card-title class="text-white">{{ $t('navigation.inbox') }}</v-card-title>
          <v-card-text style="overflow-y: visible;">
            <v-row>
              <!-- Column for today's tickets and tasks -->
              <v-col cols="12" md="6">
                <v-card class="glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12" style="height: 70vh; overflow-y: auto;">
                  <v-card-title class="text-white">{{ $t('inbox.today') }}</v-card-title>
                  <v-divider></v-divider>
                  <!-- List of today's tickets -->
                  <v-list>
                    <v-list-subheader>{{ $t('navigation.ticket') }}</v-list-subheader>
                    <template v-for="ticket in todayTickets" :key="'ticket-' + ticket.handle">
                      <v-list-item>
                        <div>{{ formatDate(ticket.deadlineDate) }}</div>
                        <h4>{{ ticket.title }}</h4>
                        <a>{{ ticket.problemDescription }}</a>
                        <template #append>
                          <v-btn icon color="primary" size="small" @click="openTicket(ticket)">
                            <v-icon>mdi-arrow-right</v-icon>
                          </v-btn>
                        </template>
                      </v-list-item>
                      <v-divider></v-divider>
                    </template>
                  </v-list>
                  <!-- List of today's tasks -->
                  <v-list>
                    <v-list-subheader>{{ $t('navigation.event') }}</v-list-subheader>
                    <template v-for="task in todayTasks" :key="'task-' + task.handle">
                      <v-list-item>
                        <div>{{ formatDateFromTo(task.startDate, task.endDate) }}</div>
                        <h4>{{ task.title }}</h4>
                        <a>{{ task.description }}</a>
                        <template #append>
                          <v-btn icon color="primary" size="small" @click="openTask(task)">
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
                <v-card class="glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12" style="height: 70vh; overflow-y: auto;">
                  <v-card-title class="text-white">{{ $t('inbox.expired') }}</v-card-title>
                  <v-divider></v-divider>
                  <!-- List of expired tickets -->
                  <v-list>
                    <v-list-subheader>{{ $t('navigation.ticket') }}</v-list-subheader>
                    <template v-for="ticket in expiredTickets" :key="'ticket-' + ticket.handle">
                      <v-list-item>
                        <div>{{ formatDate(ticket.deadlineDate) }}</div>
                        <h4>{{ ticket.title }}</h4>
                        <a>{{ ticket.problemDescription }}</a>
                        <template #append>
                          <v-btn icon color="primary" size="small" @click="openTicket(ticket)">
                            <v-icon>mdi-arrow-right</v-icon>
                          </v-btn>
                        </template>
                      </v-list-item>
                      <v-divider></v-divider>
                    </template>
                  </v-list>
                  <!-- List of expired tasks -->
                  <v-list>
                    <v-list-subheader>{{ $t('navigation.event') }}</v-list-subheader>
                    <template v-for="task in expiredTasks" :key="'task-' + task.handle">
                      <v-list-item>
                        <div>{{ formatDateFromTo(task.startDate, task.endDate) }}</div>
                        <h4>{{ task.title }}</h4>
                        <a>{{ task.description }}</a>
                        <template #append>
                          <v-btn icon color="primary" size="small" @click="openTask(task)">
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
          <SaplingActionClose :close="closeDialog" />
        </template>
      </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
//#region Import
// Import the composable for handling inbox logic
import { useSaplingInbox } from '@/composables/account/useSaplingInbox';
// Import tilt effect options for the inbox dialog
import { TILT_DEFAULT_OPTIONS, TILT_SOFT_OPTIONS } from '@/constants/tilt.constants';
// Import the new SaplingActionClose component
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue';
//#endregion

//#region Composable
// Define the emitted events for the component
const emit = defineEmits<{
  (event: 'close'): void;
}>();

// Destructure the properties and methods from the useSaplingInbox composable
const {
  isLoading, // Reactive property indicating if the inbox data is loading
  dialog, // Reactive property to control the visibility of the inbox dialog
  todayTickets, // Reactive property for today's tickets
  expiredTickets, // Reactive property for expired tickets
  todayTasks, // Reactive property for today's tasks
  expiredTasks, // Reactive property for expired tasks
  formatDate,
  formatDateFromTo,
  openTicket,
  openTask,
  closeDialog, // Method to close the inbox dialog
} = useSaplingInbox(emit);
//#endregion
</script>