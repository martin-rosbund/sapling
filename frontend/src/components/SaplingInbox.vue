
<template>
  <v-dialog v-if="dialog" v-model="dialog" persistent max-width="1200px">
    <v-card>
      <v-card-title class="bg-primary text-white">Inbox Übersicht</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="bg-primary text-white">Heute</v-card-title>
              <v-divider></v-divider>
              <v-list style="max-height: 600px; overflow-y: auto;">
                <v-list-subheader>Tickets</v-list-subheader>
                <template v-for="ticket in todayTickets" :key="'ticket-' + ticket.handle">
                  <v-list-item :title="ticket.title" :subtitle="ticket.problemDescription">
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
                <v-list-subheader>Aufgaben</v-list-subheader>
                <template v-for="task in todayTasks" :key="'task-' + task.handle">
                  <v-list-item :title="task.title" :subtitle="task.description">
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
              <v-card-title class="bg-primary text-white">Abgelaufen</v-card-title>
              <v-divider></v-divider>
              <v-list style="max-height: 600px; overflow-y: auto;">
                <v-list-subheader>Tickets</v-list-subheader>
                <template v-for="ticket in expiredTickets" :key="'ticket-' + ticket.handle">
                  <v-list-item :title="ticket.title" :subtitle="ticket.problemDescription">
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
                <v-list-subheader>Aufgaben</v-list-subheader>
                <template v-for="task in expiredTasks" :key="'task-' + task.handle">
                  <v-list-item :title="task.title" :subtitle="task.description">
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
        <v-btn color="primary" text @click="closeDialog">Schließen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { TicketItem, EventItem } from '@/entity/entity';
import ApiService from '@/services/api.service';

import { defineEmits } from 'vue';
const emit = defineEmits(['close']);
const dialog = ref(true);
const tickets = ref<TicketItem[]>([]);
const tasks = ref<EventItem[]>([]);
const todayTickets = ref<TicketItem[]>([]);
const expiredTickets = ref<TicketItem[]>([]);
const todayTasks = ref<EventItem[]>([]);
const expiredTasks = ref<EventItem[]>([]);

function isToday(date: Date | string | null | undefined) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isExpired(date: Date | string | null | undefined) {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d < now && !isToday(d);
}

function getTicketLink(ticket: TicketItem) {
  return `/ticket?handle=${ticket.handle}`;
}
function getTaskLink(task: EventItem) {
  return `/calendar?handle=${task.handle}`;
}
function closeDialog() {
  dialog.value = false;
  emit('close');
}

async function loadTicketsAndTasks() {
  tickets.value = await ApiService.findAll<TicketItem[]>('current/openTickets');
  tasks.value = await ApiService.findAll<EventItem[]>('current/openEvents');

  // Sortiere nach Kategorie
  todayTickets.value = tickets.value.filter(t => isToday(t.deadlineDate));
  expiredTickets.value = tickets.value.filter(t => isExpired(t.deadlineDate));
  todayTasks.value = tasks.value.filter(t => isToday(t.startDate));
  expiredTasks.value = tasks.value.filter(t => isExpired(t.startDate));
}

onMounted(async () => {
  await loadTicketsAndTasks();
});
</script>
