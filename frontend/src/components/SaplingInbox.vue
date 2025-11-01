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
// #region Imports
// Import required modules and components

import '@/assets/styles/SaplingInbox.css'; // Styles
import { ref, onMounted, defineEmits, watch } from 'vue'; // Vue composition API
import type { TicketItem, EventItem } from '@/entity/entity'; // Entity types
import ApiService from '@/services/api.service'; // API service
import { i18n } from '@/i18n'; // Internationalization instance
import TranslationService from '@/services/translation.service'; // Translation service
// #endregion

// #region State
// Reactive references for translation, loading, dialog, tickets, and tasks
const translationService = ref(new TranslationService()); // Translation service instance
const isLoading = ref(true); // Loading state
const dialog = ref(true); // Dialog open state
const tickets = ref<TicketItem[]>([]); // Tickets
const tasks = ref<EventItem[]>([]); // Tasks
const todayTickets = ref<TicketItem[]>([]); // Today's tickets
const expiredTickets = ref<TicketItem[]>([]); // Expired tickets
const todayTasks = ref<EventItem[]>([]); // Today's tasks
const expiredTasks = ref<EventItem[]>([]); // Expired tasks
const emit = defineEmits(['close']); // Emit close event
// #endregion

// #region Lifecycle
// On component mount, load translations and tickets/tasks
onMounted(async () => {
  await loadTranslations();
  await loadTicketsAndTasks();
});

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async () => {
  await loadTranslations();
});
// #endregion

// #region Translations
// Load translations for the inbox
async function loadTranslations() {
  isLoading.value = true;
  await translationService.value.prepare('global', 'inbox');
  isLoading.value = false;
}
// #endregion

// #region Date Helpers
// Check if a date is today
function isToday(date: Date | string | null | undefined) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// Check if a date is expired
function isExpired(date: Date | string | null | undefined) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d < now && !isToday(d);
}

// Format a date for display
function formatDate(date: Date | string | null | undefined, withTime = false) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  let result = d.toLocaleDateString();
  if (withTime) {
    result += ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return result;
}

// Format a task's date range for display
function formatTaskDate(start: Date | string | null | undefined, end: Date | string | null | undefined) {
  if (!start) return '';
  const dStart = typeof start === 'string' ? new Date(start) : start;
  const dEnd = end ? (typeof end === 'string' ? new Date(end) : end) : null;
  const sameDay = dEnd && dStart.toLocaleDateString() === dEnd.toLocaleDateString();
  const timeRange = dStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + (dEnd ? dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  if (!dEnd || sameDay) {
    return formatDate(dStart) + ' ' + timeRange;
  }
  return formatDate(dStart) + ' ' + dStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + formatDate(dEnd) + ' ' + dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
// #endregion

// #region Ticket/Event
// Get the link for a ticket
function getTicketLink(ticket: TicketItem) {
  return `/ticket?handle=${ticket.handle}`;
}
// Get the link for a task/event
function getTaskLink(task: EventItem) {
  return `/calendar?handle=${task.handle}`;
}

// Load tickets and tasks from API and categorize them
async function loadTicketsAndTasks() {
  tickets.value = await ApiService.findAll<TicketItem[]>('current/openTickets');
  tasks.value = await ApiService.findAll<EventItem[]>('current/openEvents');
  todayTickets.value = tickets.value.filter(t => isToday(t.deadlineDate));
  expiredTickets.value = tickets.value.filter(t => isExpired(t.deadlineDate));
  todayTasks.value = tasks.value.filter(t => isToday(t.startDate));
  expiredTasks.value = tasks.value.filter(t => isExpired(t.startDate));
}
// #endregion

// #region Dialog
// Close the inbox dialog
function closeDialog() {
  dialog.value = false;
  emit('close');
}
// #endregion
</script>