<template>
  <v-container class="fill-height pa-0 no-gutters full-height-container" fluid>
    <v-row class="fill-height" no-gutters style="flex:1 1 0;height:100vh;min-height:0;width:100%;margin-left:0;margin-right:0;overflow:hidden;">
      <!-- Ticketliste -->
      <v-col cols="12" md="9" class="d-flex flex-column" style="height:100%;min-height:0;">
        <v-card flat class="rounded-0" style="height:100%;display:flex;flex-direction:column;min-height:0;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-ticket</v-icon> Ticketübersicht
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" style="overflow:auto;flex:1 1 0;min-height:0;">
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
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;height:100%;min-height:0;max-height:100vh;">
        <v-card class="sideboard-card rounded-0" flat style="height:100%;display:flex;flex-direction:column;min-height:0;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-account-group</v-icon> Personen & Firmen
          </v-card-title>
          <v-divider></v-divider>
          <div class="sideboard-list-scroll" style="flex:1;min-height:0;max-height:100vh;">
            <PersonCompanyFilter
              :people="people"
              :companies="companies"
              :selectedFilters="selectedFilters"
              @togglePerson="togglePerson"
              @toggleCompany="toggleCompany"
            />
          </div>
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

import { onMounted } from 'vue';
import ApiGenericService from '../services/api.generic.service';
const people = ref<PersonItem[]>([]);

onMounted(async () => {
  try {
    const res = await ApiGenericService.find<PersonItem>('person');
    people.value = res.data;
  } catch (e) {
    console.error('Fehler beim Laden der Personen:', e);
  }
});
import type { CompanyItem } from '@/entity/entity';
const companies = ref<CompanyItem[]>([]);

onMounted(async () => {
  try {
    const res = await ApiGenericService.find<CompanyItem>('company');
    companies.value = res.data;
  } catch (e) {
    console.error('Fehler beim Laden der Firmen:', e);
  }
});

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
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import type { PersonItem } from '@/entity/entity';
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
.vertical-item {
  display: flex;
  align-items: center;
  border-radius: 18px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 8px;
}
.vertical-item.selected {
  background: #e0e0e01a;
  border: 1px solid #1976d2;
}
/* Nur die Personen-/Firmenliste scrollbar machen, dynamisch mit Flexbox */
/* Flexbox-Layout für dynamische Höhe, nur die Liste scrollt */
.sideboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.sideboard-list-scroll {
  flex: 1;
  min-height: 0;
  max-height: 100dvh;
  overflow-y: auto;
}
/* Volle Breite und volle Höhe für den Container erzwingen */
.full-height-container {
  width: 100%  !important;
  max-width: 100% !important;
  height: 100vh !important;
  min-height: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>
