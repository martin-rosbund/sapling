<template>
  <v-container class="fill-height pa-0 no-gutters full-height-container" fluid>
    <v-row class="fill-height" no-gutters style="flex:1 1 0;height:100vh;min-height:0;width:100%;margin-left:0;margin-right:0;overflow:hidden;">
      <!-- Ticketliste -->
      <v-col cols="12" md="9" class="d-flex flex-column" style="height:100%;min-height:0;">
        <v-card flat class="rounded-0" style="height:100%;display:flex;flex-direction:column;min-height:0;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.ticket') }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" style="overflow:auto;flex:1 1 0;min-height:0;">
            <v-data-table
              :headers="ticketHeaders"
              :items="filteredTickets"
              :items-per-page="25"
              class="elevation-0"
              dense
              :footer-props="{ itemsPerPageOptions: [10, 25, 50] }"
              show-expand
            >
              <template #item.status="{ item }">
                <v-chip :color="item.status?.color" small>{{ item.status?.description }}</v-chip>
              </template>
              <template #item.assignee="{ item }">
                <v-avatar size="24" class="mr-1" v-if="item.assignee && item.assignee.email">
                  <img :src="`https://www.gravatar.com/avatar/${item.assignee.email ? item.assignee.email.trim().toLowerCase() : ''}?d=identicon`" />
                </v-avatar>
                {{ item.assignee ? (item.assignee.firstName + ' ' + item.assignee.lastName) : '' }}
              </template>
              <template #item.creator="{ item }">
                <v-avatar size="24" class="mr-1" v-if="item.creator && item.creator.email">
                  <img :src="`https://www.gravatar.com/avatar/${item.creator.email ? item.creator.email.trim().toLowerCase() : ''}?d=identicon`" />
                </v-avatar>
                {{ item.creator ? (item.creator.firstName + ' ' + item.creator.lastName) : '' }}
              </template>
              <template #item.company="{ item }">
                <v-icon left small>mdi-domain</v-icon>
                {{ item.assignee && item.assignee.company ? item.assignee.company.name : '' }}
              </template>
              <template #item.priority="{ item }">
                <v-chip v-if="item.priority" :color="item.priority.color" small>{{ item.priority.description }}</v-chip>
              </template>
              <template #item.startDate="{ item }">
                <span v-if="item.startDate">{{ formatDateTime(item.startDate) }}</span>
              </template>
              <template #item.endDate="{ item }">
                <span v-if="item.endDate">{{ formatDateTime(item.endDate) }}</span>
              </template>
              <template #item.deadlineDate="{ item }">
                <span v-if="item.deadlineDate">{{ formatDateTime(item.deadlineDate) }}</span>
              </template>
              <template #item.createdAt="{ item }">
                <span v-if="item.createdAt">{{ formatDateTime(item.createdAt) }}</span>
              </template>
              <template #item.updatedAt="{ item }">
                <span v-if="item.updatedAt">{{ formatDateTime(item.updatedAt) }}</span>
              </template>
              <template #expanded-row="{ item }">
                <tr>
                  <td :colspan="ticketHeaders.length">
                    <div v-if="item.problemDescription" style="margin-bottom: 8px;">
                      <strong>{{ $t('ticket.problemDescription') }}</strong>
                      <div style="white-space: pre-line;">{{ item.problemDescription }}</div>
                    </div>
                    <div v-if="item.solutionDescription">
                      <strong>{{ $t('ticket.solutionDescription') }}</strong>
                      <div style="white-space: pre-line;">{{ item.solutionDescription }}</div>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Personen-/Firmenliste (Filter) -->
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;height:100%;min-height:0;max-height:100vh;">
        <v-card class="sideboard-card rounded-0" flat style="height:100%;display:flex;flex-direction:column;min-height:0;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
          </v-card-title>
          <v-divider></v-divider>
          <div class="sideboard-list-scroll" style="flex:1;min-height:0;max-height:100vh;">
            <PersonCompanyFilter
              :people="people"
              :companies="companies"
              :people-total="peopleTotal"
              :people-search="peopleSearch"
              :people-page="peoplePage"
              :people-page-size="5"
              :companies-total="companiesTotal"
              :companies-search="companiesSearch"
              :companies-page="companiesPage"
              :companies-page-size="5"
              :selectedFilters="selectedFilters"
              @togglePerson="togglePerson"
              @toggleCompany="toggleCompany"
              @searchPeople="onPeopleSearch"
              @searchCompanies="onCompaniesSearch"
              @pagePeople="onPeoplePage"
              @pageCompanies="onCompaniesPage"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { onMounted } from 'vue';
import ApiGenericService from '../services/api.generic.service';
import type { TicketItem, PersonItem, CompanyItem, EntityItem } from '@/entity/entity';
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';

const tickets = ref<TicketItem[]>([]);
const people = ref<PersonItem[]>([]);
const companies = ref<CompanyItem[]>([]);
// Paging/Suche für Personen/Firmen
const peopleSearch = ref('');
const peoplePage = ref(1);
const peopleTotal = ref(0);
const companiesSearch = ref('');
const companiesPage = ref(1);
const companiesTotal = ref(0);
const templates = ref<EntityTemplate[]>([]);
const entity = ref<EntityItem | null>(null);

// Mehrfachauswahl-Filter-State
const selectedFilters = ref<(number | string)[]>([]);

// Tabellen-Header wie in EntityTable dynamisch aus templates ableiten
const ticketHeaders = computed(() => {
  // Mapping: key = name, title = name, width = length (falls vorhanden)
  return templates.value
    .filter(t => !t.isAutoIncrement && t.name !== 'problemDescription' && t.name !== 'solutionDescription')
    .map(t => ({
      key: t.name,
      title: i18n.global.t(`ticket.${t.name}`),
      width: t.length ? Number(t.length) : undefined
    }));
});

// Filter-Logik für Mehrfachauswahl
const filteredTickets = computed(() => tickets.value);

// Tickets laden
async function loadTickets() {
  try {
    const assigneeIds = selectedFilters.value.filter(f => typeof f === 'number');
    const companyIds = selectedFilters.value
      .filter(f => typeof f === 'string' && f.startsWith('company-'))
      .map(f => Number((f as string).replace('company-', '')));
    const params: any = {};
    if (assigneeIds.length > 0) params.assignee = assigneeIds;
    if (companyIds.length > 0) params.company = companyIds;
    const res = await ApiGenericService.find<TicketItem>('ticket', params);
    tickets.value = res.data;
  } catch (e) {
    console.error('Fehler beim Laden der Tickets:', e);
    tickets.value = [];
  }
}

// Personen-/Firmen-Filter-Methoden
function togglePerson(personId: number, checked?: boolean) {
  const index = selectedFilters.value.indexOf(personId);
  if (checked === undefined) {
    if (index === -1) selectedFilters.value.push(personId);
    else selectedFilters.value.splice(index, 1);
  } else {
    if (checked && index === -1) selectedFilters.value.push(personId);
    else if (!checked && index !== -1) selectedFilters.value.splice(index, 1);
  }
  loadTickets();
}

function toggleCompany(companyId: number, checked?: boolean) {
  const key = 'company-' + companyId;
  const index = selectedFilters.value.indexOf(key);
  if (checked === undefined) {
    if (index === -1) selectedFilters.value.push(key);
    else selectedFilters.value.splice(index, 1);
  } else {
    if (checked && index === -1) selectedFilters.value.push(key);
    else if (!checked && index !== -1) selectedFilters.value.splice(index, 1);
  }
  loadTickets();
}

// Hilfsfunktion zum Formatieren von Datum und Uhrzeit
function formatDateTime(date: string | Date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function onPeopleSearch(val: string) {
  if (peopleSearch.value !== val) {
    peopleSearch.value = val;
    peoplePage.value = 1;
  }
  loadPeople(val, 1);
}
function onCompaniesSearch(val: string) {
  if (companiesSearch.value !== val) {
    companiesSearch.value = val;
    companiesPage.value = 1;
  }
  loadCompanies(val, 1);
}
function onPeoplePage(val: number) {
  if (peoplePage.value !== val) {
    peoplePage.value = val;
  }
  loadPeople(peopleSearch.value, val);
}
function onCompaniesPage(val: number) {
  if (companiesPage.value !== val) {
    companiesPage.value = val;
  }
  loadCompanies(companiesSearch.value, val);
}

// Initiales Laden der Tickets (ohne Filter)
onMounted(() => {
  loadTickets();
});

onMounted(async () => {
  entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { handle: 'ticket' }, {}, 1, 1)).data[0] || null;
});

// Personen/Firmen initial paginiert laden
async function loadPeople(search = '', page = 1) {
  const filter = search ? { $or: [
    { firstName: { $like: `%${search}%` } },
    { lastName: { $like: `%${search}%` } },
    { email: { $like: `%${search}%` } }
  ] } : {};
  const res = await ApiGenericService.find<PersonItem>('person', filter, {}, page, 5);
  people.value = res.data;
  peopleTotal.value = res.meta?.total || 0;
}
async function loadCompanies(search = '', page = 1) {
  const filter = search ? { name: { $like: `%${search}%` } } : {};
  const res = await ApiGenericService.find<CompanyItem>('company', filter, {}, page, 5);
  companies.value = res.data;
  companiesTotal.value = res.meta?.total || 0;
}

onMounted(() => {
  loadPeople();
  loadCompanies();
});

onMounted(async () => {
  templates.value = await ApiService.findAll<EntityTemplate[]>(`template/ticket`);
});

onMounted(async () => {
    const translationService = new TranslationService();
    await translationService.prepare('global', 'ticket');
});
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
