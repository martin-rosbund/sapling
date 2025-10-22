<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height" no-gutters>
      <!-- Ticketliste -->
      <v-col cols="12" md="9" class="d-flex flex-column">
        <v-card flat class="rounded-0" style="height:100%;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-ticket</v-icon> Ticketübersicht
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" style="overflow:auto;">
            <v-data-table
              :headers="ticketHeaders"
              :items="filteredTickets"
              :items-per-page="10"
              class="elevation-0"
              dense
              :footer-props="{ itemsPerPageOptions: [10, 25, 50] }"
            >
              <template #item.status="{ item }">
                <v-chip :color="statusColor(item.status)" small>{{ item.status }}</v-chip>
              </template>
              <template #item.assignee="{ item }">
                <v-avatar size="24" class="mr-1" v-if="item.assigneeAvatar">
                  <img :src="item.assigneeAvatar" />
                </v-avatar>
                {{ item.assignee }}
              </template>
              <template #item.company="{ item }">
                <v-icon left small>mdi-domain</v-icon>
                {{ item.company }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Personen-/Firmenliste (Filter) -->
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;">
        <v-card class="sideboard-card rounded-0" flat>
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-account-group</v-icon> Personen & Firmen
          </v-card-title>
          <v-divider></v-divider>
          <v-list dense>
            <v-list-item
              :active="selectedFilter === null"
              @click="selectedFilter = null"
              class="favorite-item"
            >
              <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
              <div>Alle anzeigen</div>
            </v-list-item>
            <v-divider class="my-1"></v-divider>
            <v-list-subheader>Personen</v-list-subheader>
            <v-list-item
              v-for="person in people"
              :key="'person-' + person.id"
              :active="selectedFilter === person.id"
              @click="selectedFilter = person.id"
              class="favorite-item"
            >
              <v-avatar size="24" class="mr-2">
                <img :src="person.avatar" />
              </v-avatar>
              <div>{{ person.name }}</div>
            </v-list-item>
            <v-divider class="my-1"></v-divider>
            <v-list-subheader>Firmen</v-list-subheader>
            <v-list-item
              v-for="company in companies"
              :key="'company-' + company.id"
              :active="selectedFilter === 'company-' + company.id"
              @click="selectedFilter = 'company-' + company.id"
              class="favorite-item"
            >
              <v-icon class="mr-2">mdi-domain</v-icon>
              <div>{{ company.name }}</div>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Dummy-Daten für Tickets
const tickets = ref([
  {
    id: 101,
    title: 'Login funktioniert nicht',
    status: 'Offen',
    assignee: 'Max Mustermann',
    assigneeId: 1,
    assigneeAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    company: 'Acme GmbH',
    companyId: 1,
    createdAt: '2025-10-01',
    updatedAt: '2025-10-02',
    priority: 'Hoch',
  },
  {
    id: 102,
    title: 'Fehler beim Speichern',
    status: 'In Bearbeitung',
    assignee: 'Erika Musterfrau',
    assigneeId: 2,
    assigneeAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    company: 'Beta AG',
    companyId: 2,
    createdAt: '2025-10-03',
    updatedAt: '2025-10-04',
    priority: 'Mittel',
  },
  {
    id: 103,
    title: 'Feature-Wunsch: Dunkelmodus',
    status: 'Geschlossen',
    assignee: 'Max Mustermann',
    assigneeId: 1,
    assigneeAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    company: 'Acme GmbH',
    companyId: 1,
    createdAt: '2025-09-28',
    updatedAt: '2025-10-01',
    priority: 'Niedrig',
  },
]);

// Dummy-Daten für Personen und Firmen
const people = [
  { id: 1, name: 'Max Mustermann', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: 'Erika Musterfrau', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
];
const companies = [
  { id: 1, name: 'Acme GmbH' },
  { id: 2, name: 'Beta AG' },
];

// Filter-State
const selectedFilter = ref<null | number | string>(null);

// Tabellen-Header
const ticketHeaders = [
  { title: 'ID', value: 'id', width: 60 },
  { title: 'Titel', value: 'title', width: 250 },
  { title: 'Status', value: 'status', width: 120 },
  { title: 'Bearbeiter', value: 'assignee', width: 160 },
  { title: 'Firma', value: 'company', width: 160 },
  { title: 'Priorität', value: 'priority', width: 100 },
  { title: 'Erstellt', value: 'createdAt', width: 110 },
  { title: 'Aktualisiert', value: 'updatedAt', width: 110 },
];

// Filter-Logik
const filteredTickets = computed(() => {
  if (selectedFilter.value === null) return tickets.value;
  // Person
  if (typeof selectedFilter.value === 'number') {
    return tickets.value.filter(t => t.assigneeId === selectedFilter.value);
  }
  // Company
  if (typeof selectedFilter.value === 'string' && selectedFilter.value.startsWith('company-')) {
    const companyId = Number(selectedFilter.value.replace('company-', ''));
    return tickets.value.filter(t => t.companyId === companyId);
  }
  return tickets.value;
});

// Status-Farbe
function statusColor(status: string) {
  switch (status) {
    case 'Offen': return 'red lighten-2';
    case 'In Bearbeitung': return 'orange lighten-2';
    case 'Geschlossen': return 'green lighten-2';
    default: return 'grey lighten-1';
  }
}
</script>

<style scoped>
.sideboard {
  border-left: 1px solid #e0e0e0;
  margin-right: 0 !important;
  padding-right: 0 !important;
  right: 0;
}
.sideboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.favorite-item {
  cursor: pointer;
}
.v-list-item--active {
  background: #e0e0e01a !important;
}
</style>
