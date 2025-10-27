<template>
  <v-container class="sapling-ticket-container pa-0 no-gutters" fluid>
  <v-skeleton-loader
  v-if="isLoading"
  elevation="12" 
  class="sapling-ticket-skeleton-loader fill-height" 
  type="article, actions, table"/>
      <template v-else>
  <v-row class="sapling-ticket-row fill-height" no-gutters>
        <!-- Ticketliste -->
  <v-col cols="12" md="9" class="sapling-ticket-main-table-col d-flex flex-column">
          <v-card flat class="sapling-ticket-main-table-card rounded-0 d-flex flex-column">
            <v-card-title class="sapling-ticket-main-table-title bg-primary text-white">
              <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.ticket') }}
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="sapling-ticket-table-text pa-0 flex-grow-1">
              <div class="sapling-ticket-table-scroll">
                <v-data-table-server
                  :headers="ticketHeaders"
                  :items="tickets"
                  :items-length="ticketsTotal"
                  :loading="isLoading"
                  :items-per-page="tableOptions.itemsPerPage"
                  :page="tableOptions.page"
                  :sort-by="tableOptions.sortBy"
                  :sort-desc="tableOptions.sortDesc"
                  class="sapling-ticket-table elevation-0"
                  dense
                  :footer-props="{ itemsPerPageOptions: DEFAULT_PAGE_SIZE_OPTIONS }"
                  show-expand
                  v-model:expanded="expandedRows"
                  :item-value="'handle'"
                  single-expand
                  @update:options="onTableOptionsUpdate"
                >
                <template #item.status="{ item }">
                  <v-chip :color="item.status?.color" small>{{ item.status?.description }}</v-chip>
                </template>
                <template #item.assignee="{ item }">
                  <v-icon left small>mdi-account</v-icon>
                  {{ item.assignee ? (item.assignee.firstName + ' ' + item.assignee.lastName) : '' }}
                </template>
                <template #item.creator="{ item }">
                  <v-icon left small>mdi-account</v-icon>
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
                <template #expanded-row="{ item }">
                  <td :colspan="ticketHeaders.length">
                    <div v-if="item.problemDescription" class="sapling-ticket-problem-description">
                      <v-card outlined class="sapling-ticket-problem-card mb-2 pa-2">
                        <v-card-title class="sapling-ticket-problem-title pa-1 pb-0">
                          <v-icon left color="error" size="18">mdi-alert-circle</v-icon>
                          {{ $t('ticket.problemDescription') }}
                        </v-card-title>
                        <v-card-text class="sapling-ticket-description-preline pa-2">
                          <div v-html="formatRichText(item.problemDescription)"></div>
                        </v-card-text>
                      </v-card>
                    </div>
                    <div v-if="item.solutionDescription">
                      <v-card outlined class="sapling-ticket-solution-card pa-2">
                        <v-card-title class="sapling-ticket-solution-title pa-1 pb-0">
                          <v-icon left color="success" size="18">mdi-lightbulb-on</v-icon>
                          {{ $t('ticket.solutionDescription') }}
                        </v-card-title>
                        <v-card-text class="sapling-ticket-description-preline pa-2">
                          <div v-html="formatRichText(item.solutionDescription)"></div>
                        </v-card-text>
                      </v-card>
                    </div>
                  </td>
                </template>
                </v-data-table-server>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Personen-/Firmenliste (Filter) -->
  <v-col cols="12" md="3" class="sapling-ticket-sideboard sideboard d-flex flex-column">
          <v-card class="sapling-ticket-sideboard-card sideboard-card rounded-0 d-flex flex-column" flat>
            <v-card-title class="sapling-ticket-sideboard-title bg-primary text-white">
              <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
            </v-card-title>
            <v-divider></v-divider>
            <div class="sapling-ticket-sideboard-list-scroll d-flex flex-column">
              <PersonCompanyFilter
                :people="people"
                :companies="companies"
                :people-total="peopleTotal"
                :people-search="peopleSearch"
                :people-page="peoplePage"
                :people-page-size="DEFAULT_PAGE_SIZE_SMALL"
                :companies-total="companiesTotal"
                :companies-search="companiesSearch"
                :companies-page="companiesPage"
                :companies-page-size="DEFAULT_PAGE_SIZE_SMALL"
                :selectedFilters="selectedFilters"
                :sideboard-height="true"
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
    </template>
  </v-container>
</template>

<script setup lang="ts">
import '@/assets/styles/SaplingTicket.css';
import { computed, watch, ref, onMounted } from 'vue';
import ApiGenericService from '../services/api.generic.service';
import type { TicketItem, PersonItem, CompanyItem, EntityItem } from '@/entity/entity';
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import { DEFAULT_PAGE_SIZE_MEDIUM, DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';

const tickets = ref<TicketItem[]>([]);
const ticketsTotal = ref(0);

// Table options for server-side paging/sorting
const tableOptions = ref({
  page: 1,
  itemsPerPage: DEFAULT_PAGE_SIZE_MEDIUM,
  sortBy: [],
  sortDesc: [],
});

function onTableOptionsUpdate(options: any) {
  tableOptions.value = options;
  loadTickets();
}
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

// Translation service instance (reactive)
const translationService = ref(new TranslationService());

// Loading state for async operations
const isLoading = ref(true);

// Mehrfachauswahl-Filter-State
const selectedFilters = ref<(number | string)[]>([]);
// Zustand für expandierte Zeilen der Tabelle

const expandedRows = ref<string[]>([]);
// Tabellen-Header wie in SaplingEntity dynamisch aus templates ableiten
const ticketHeaders = computed(() => {
  // Mapping: key = name, title = name, width = length (falls vorhanden)
  return templates.value
    .filter(t => !t.isAutoIncrement && !t.isSystem && t.name !== 'problemDescription' && t.name !== 'solutionDescription' && t.name !== 'timeTrackings')
    .map(t => ({
      key: t.name,
      title: i18n.global.t(`ticket.${t.name}`),
      width: t.length ? Number(t.length) : undefined
    }));
});

// Filter-Logik für Mehrfachauswahl
// (filteredTickets removed, not needed for server table)

// Tickets laden
async function loadTickets() {
  const assigneeIds = selectedFilters.value.filter(f => typeof f === 'number');
  const companyIds = selectedFilters.value
    .filter(f => typeof f === 'string' && f.startsWith('company-'))
    .map(f => Number((f as string).replace('company-', '')));
  const filter: any = {};
  if (assigneeIds.length > 0) filter.assignee = assigneeIds;
  if (companyIds.length > 0) filter.company = companyIds;
  const { page, itemsPerPage, sortBy, sortDesc } = tableOptions.value;
  let orderBy: any = undefined;
  if (sortBy.length) {
    orderBy = {};
    sortBy.forEach((key: string, i: number) => {
      orderBy[key] = sortDesc[i] ? 'DESC' : 'ASC';
    });
  }
  const res = await ApiGenericService.find<TicketItem>('ticket', {
    filter,
    relations: ['m:1'],
    page,
    limit: itemsPerPage,
    orderBy,
  });
  tickets.value = res.data;
  ticketsTotal.value = res.meta?.total || res.data.length;
}

// Hilfsfunktion für Rich-Text-Formatierung (RTF/HTML)
function formatRichText(text: string | undefined | null): string {
  if (!text) return '';
  // Hier könnte man z.B. Markdown oder RTF in HTML umwandeln, aktuell wird HTML direkt unterstützt.
  // Für RTF: Einfache RTF zu HTML Konvertierung ist komplex, daher hier nur ein Platzhalter.
  // Alternativ: Einfache Zeilenumbrüche und Links erkennen.
  const html = text
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  return html;
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
  prepareTranslations();
  loadTickets();
  loadPeople();
  loadCompanies();
});

onMounted(async () => {
  entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'ticket' }, limit: 1, page: 1 })).data[0] || null;
});

onMounted(async () => {
  templates.value = await ApiService.findAll<EntityTemplate[]>(`template/ticket`);
});

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async () => {
  await prepareTranslations();
});

/**
 * Prepare translations for navigation and group labels.
 */
async function prepareTranslations() {
   isLoading.value = true;
  await translationService.value.prepare('global', 'ticket');
  isLoading.value = false;
}

// Personen/Firmen initial paginiert laden
async function loadPeople(search = '', page = 1) {
  const filter = search ? { $or: [
    { firstName: { $like: `%${search}%` } },
    { lastName: { $like: `%${search}%` } },
    { email: { $like: `%${search}%` } }
  ] } : {};
  const res = await ApiGenericService.find<PersonItem>('person', {filter,page, limit: DEFAULT_PAGE_SIZE_SMALL});
  people.value = res.data;
  peopleTotal.value = res.meta?.total || 0;
}
async function loadCompanies(search = '', page = 1) {
  const filter = search ? { name: { $like: `%${search}%` } } : {};
  const res = await ApiGenericService.find<CompanyItem>('company', {filter,page, limit: DEFAULT_PAGE_SIZE_SMALL});
  companies.value = res.data;
  companiesTotal.value = res.meta?.total || 0;
}
</script>