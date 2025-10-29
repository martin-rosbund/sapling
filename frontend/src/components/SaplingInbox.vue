
<template>
  <v-app>
    <v-main>
      <v-container class="py-8 px-6" fluid>
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="bg-primary text-white">Heute</v-card-title>
              <v-divider></v-divider>
              <v-list>
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
              <v-list>
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
      </v-container>
    </v-main>
  </v-app>
</template>


<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '@/services/api.generic.service';
import type { TicketItem, EventItem, PersonItem } from '@/entity/entity';

const ownPerson = ref<PersonItem | null>(null);
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

async function loadOwnPerson() {
  const store = useCurrentPersonStore();
  await store.fetchCurrentPerson();
  ownPerson.value = store.person;
}

async function loadTicketsAndTasks() {
  if (!ownPerson.value || !ownPerson.value.handle) return;
  // Tickets: assigned to ownPerson
  const ticketRes = await ApiGenericService.find<TicketItem>('ticket', {
    filter: { assignee: ownPerson.value.handle, status : { $nin: ['closed'] } },
    relations: ['status', 'priority', 'assignee'],
    limit: 100
  });
  tickets.value = ticketRes.data || [];

  // Tasks: EventItem where ownPerson is participant
  const taskRes = await ApiGenericService.find<EventItem>('event', {
    filter: { participants: [ownPerson.value.handle], status : { $nin: ['canceled', 'completed'] } },
    relations: ['status', 'type', 'participants'],
    limit: 100
  });
  tasks.value = taskRes.data || [];

  // Sortiere nach Kategorie
  todayTickets.value = tickets.value.filter(t => isToday(t.startDate));
  expiredTickets.value = tickets.value.filter(t => isExpired(t.startDate));
  todayTasks.value = tasks.value.filter(t => isToday(t.startDate));
  expiredTasks.value = tasks.value.filter(t => isExpired(t.startDate));
}

onMounted(async () => {
  await loadOwnPerson();
  await loadTicketsAndTasks();
});
</script>
