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
            <v-list-subheader>Personen</v-list-subheader>
            <div>
              <div
                v-for="person in people"
                :key="'person-' + person.id"
                class="vertical-item"
                :class="{ 'selected': selectedFilters.includes(person.id) }"
                @click="togglePerson(person.id)"
                style="align-items: center;"
              >
                <v-avatar size="24" class="mr-1">
                  <img :src="person.avatar" />
                </v-avatar>
                <span style="flex:1">{{ person.name }}</span>
                <v-checkbox
                  :model-value="selectedFilters.includes(person.id)"
                  @update:model-value="checked => togglePerson(person.id, checked)"
                  hide-details
                  density="compact"
                  class="ml-1"
                  @click.stop
                  :ripple="false"
                  style="pointer-events: none;"
                />
              </div>
            </div>
            <v-divider class="my-2"></v-divider>
            <v-list-subheader>Firmen</v-list-subheader>
            <div>
              <div
                v-for="company in companies"
                :key="'company-' + company.id"
                class="vertical-item"
                :class="{ 'selected': selectedFilters.includes('company-' + company.id) }"
                @click="toggleCompany(company.id)"
                style="align-items: center;"
              >
                <v-icon class="mr-1" size="24">mdi-domain</v-icon>
                <span style="flex:1">{{ company.name }}</span>
                <v-checkbox
                  :model-value="selectedFilters.includes('company-' + company.id)"
                  @update:model-value="checked => toggleCompany(company.id, checked)"
                  hide-details
                  density="compact"
                  class="ml-1"
                  @click.stop
                  :ripple="false"
                  style="pointer-events: none;"
                />
              </div>
            </div>
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

// Mehrfachauswahl-Filter-State
const selectedFilters = ref<(number | string)[]>([]);

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

// Filter-Logik für Mehrfachauswahl
const filteredTickets = computed(() => {
  if (selectedFilters.value.length === 0) return tickets.value;
  const personIds = selectedFilters.value.filter(f => typeof f === 'number');
  const companyIds = selectedFilters.value
    .filter(f => typeof f === 'string' && f.startsWith('company-'))
    .map(f => Number((f as string).replace('company-', '')));
  return tickets.value.filter(t =>
    personIds.includes(t.assigneeId) ||
    companyIds.includes(t.companyId)
  );
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

// Personen-/Firmen-Filter-Methoden
function togglePerson(personId: number, checked?: boolean) {
  const index = selectedFilters.value.indexOf(personId);
  if (checked === undefined) {
    // Toggle ohne explizite Überprüfung
    if (index === -1) selectedFilters.value.push(personId);
    else selectedFilters.value.splice(index, 1);
  } else {
    // Explizite Überprüfung
    if (checked && index === -1) selectedFilters.value.push(personId);
    else if (!checked && index !== -1) selectedFilters.value.splice(index, 1);
  }
}

function toggleCompany(companyId: number, checked?: boolean) {
  const key = 'company-' + companyId;
  const index = selectedFilters.value.indexOf(key);
  if (checked === undefined) {
    // Toggle ohne explizite Überprüfung
    if (index === -1) selectedFilters.value.push(key);
    else selectedFilters.value.splice(index, 1);
  } else {
    // Explizite Überprüfung
    if (checked && index === -1) selectedFilters.value.push(key);
    else if (!checked && index !== -1) selectedFilters.value.splice(index, 1);
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
.vertical-item {
  display: flex;
  align-items: center;
  border-radius: 18px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 8px;
}
.vertical-item.selected {
  background: #e0e0e01a;
  border: 1px solid #1976d2;
}
</style>
