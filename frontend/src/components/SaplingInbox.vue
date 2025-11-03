<template>
  <v-skeleton-loader
  v-if="isLoading"
  class="mx-auto"
  elevation="12"
  type="article, actions"/>
  <template v-else>
    <v-dialog v-if="dialog" v-model="dialog" persistent max-width="1200px">
      <v-card>
        <v-card-title class="bg-primary text-white">{{ $t('navigation.inbox') }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-card>
                <v-card-title class="bg-primary text-white">{{ $t('inbox.today') }}</v-card-title>
                <v-divider></v-divider>
                <v-list style="max-height: 600px; overflow-y: auto;">
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
                <v-list style="max-height: 600px; overflow-y: auto;">
                  <v-list-subheader>{{ $t('navigation.event') }}</v-list-subheader>
                  <template v-for="task in todayTasks" :key="'task-' + task.handle">
                    <v-list-item>
                      <div class="sapling-inbox-date">{{ formatTaskDate(task.startDate, task.endDate) }}</div>
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
            <v-col cols="12" md="6">
              <v-card>
                <v-card-title class="bg-primary text-white">{{ $t('inbox.expired') }}</v-card-title>
                <v-divider></v-divider>
                <v-list style="max-height: 600px; overflow-y: auto;">
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
                <v-list style="max-height: 600px; overflow-y: auto;">
                  <v-list-subheader>{{ $t('navigation.event') }}</v-list-subheader>
                  <template v-for="task in expiredTasks" :key="'task-' + task.handle">
                    <v-list-item>
                      <div class="sapling-inbox-date">{{ formatTaskDate(task.startDate, task.endDate) }}</div>
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
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="closeDialog">{{ $t('global.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
</template>


<script setup lang="ts">
import '@/assets/styles/SaplingInbox.css';
import { useSaplingInbox } from '../composables/useSaplingInbox';
import { defineEmits } from 'vue';

const emit = defineEmits(['close']);
const {
  isLoading,
  dialog,
  todayTickets,
  expiredTickets,
  todayTasks,
  expiredTasks,
  formatDate,
  formatTaskDate,
  getTicketLink,
  getTaskLink,
  closeDialog,
} = useSaplingInbox(emit);
</script>