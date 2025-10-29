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
                  :items="tickets?.data || []"
                  :items-length="tickets?.meta?.total || 0"
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
                <SaplingWorkFilter
                  :people="peoples?.data || []"
                  :companies="companies?.data || []"
                  :company-people="companyPeoples?.data || []"
                  :own-person="ownPerson"
                  :people-total="peoples?.meta.total || 0"
                  :people-search="peopleSearch"
                  :people-page="peoples?.meta.page || 1"
                  :people-page-size="DEFAULT_PAGE_SIZE_SMALL"
                  :companies-total="companies?.meta.total || 0"
                  :companies-search="companiesSearch"
                  :companies-page="companies?.meta.page || 1"
                  :companies-page-size="DEFAULT_PAGE_SIZE_SMALL"
                  :selectedPeople="selectedPeoples"
                  :selectedCompanies="selectedCompanies"
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
//#region Imports
import '@/assets/styles/SaplingTicket.css';
import { computed, watch, ref, onMounted } from 'vue';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '../services/api.generic.service';
import type { TicketItem, PersonItem, CompanyItem, EntityItem } from '@/entity/entity';
import SaplingWorkFilter from './filter/SaplingWorkFilter.vue';
import ApiService from '@/services/api.service';
import type { EntityTemplate, PaginatedResponse } from '@/entity/structure';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import { DEFAULT_PAGE_SIZE_MEDIUM, DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
//#endregion

//#region Properties
const translationService = ref(new TranslationService());
const ownPerson = ref<PersonItem | null>(null);
const expandedRows = ref<string[]>([]);
const isLoading = ref(true);

const tickets = ref<PaginatedResponse<TicketItem>>();

const peoples = ref<PaginatedResponse<PersonItem>>();
const companies = ref<PaginatedResponse<CompanyItem>>();
const companyPeoples = ref<PaginatedResponse<PersonItem>>();

const selectedPeoples = ref<number[]>([]);
const selectedCompanies = ref<number[]>([]);

const peopleSearch = ref('');
const companiesSearch = ref('');

const templates = ref<EntityTemplate[]>([]);
const entity = ref<EntityItem | null>(null);
//#endregion

//#region Lifecycle
onMounted(async () => {
  await setOwnPerson();
  await loadTranslations();
  loadEntity();
  loadPeople();
  loadCompanies();
  loadCompanyPeople(ownPerson.value);
  loadTickets();
  loadTemplates();
});

watch(() => i18n.global.locale.value, async () => {
  await loadTranslations();
});

watch(selectedPeoples, () => {
  loadTickets();
}, { deep: true });
//#endregion

//#region Ticket
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

async function loadTickets() {
  const filter = { assignee: { $in: selectedPeoples.value } };
  const { page, itemsPerPage, sortBy, sortDesc } = tableOptions.value;

  let orderBy: any = undefined;
  if (sortBy.length) {
    orderBy = {};
    sortBy.forEach((key: string, i: number) => {
      orderBy[key] = sortDesc[i] ? 'DESC' : 'ASC';
    });
  }
  
  const response = await ApiGenericService.find<TicketItem>('ticket', {
    filter,
    relations: ['m:1'],
    page,
    limit: itemsPerPage,
    orderBy,
  });

  tickets.value = response;
}

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
//#endregion

//#region Formatter
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

// Hilfsfunktion zum Formatieren von Datum und Uhrzeit
function formatDateTime(date: string | Date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
//#endregion 

//#region Entity
async function loadTemplates() {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/ticket`);
};

async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'ticket' }, limit: 1, page: 1 })).data[0] || null;
};
//#endregion

//#region Translations
async function loadTranslations() {
   isLoading.value = true;
  await translationService.value.prepare('global', 'ticket');
  isLoading.value = false;
}
//#endregion

//#region People and Company
async function setOwnPerson(){
    const currentPersonStore = useCurrentPersonStore();
    await currentPersonStore.fetchCurrentPerson();
    ownPerson.value = currentPersonStore.person;
    selectedPeoples.value = [ownPerson.value?.handle || 0];
}

async function loadPeople(search = '', page = 1) {
  const filter = search ? { $or: [
    { firstName: { $like: `%${search}%` } },
    { lastName: { $like: `%${search}%` } },
    { email: { $like: `%${search}%` } }
  ] } : {};
  peoples.value= await ApiGenericService.find<PersonItem>('person', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
}

async function loadCompanyPeople(person: PersonItem | null) {
  const filter = { company: person?.company?.handle || 0 };
  companyPeoples.value= await ApiGenericService.find<PersonItem>('person', {filter, limit: DEFAULT_PAGE_SIZE_SMALL});
}

async function loadPeopleByCompany() {
  const filter = { company: { $in: selectedCompanies.value } };
  const list = await ApiGenericService.find<PersonItem>('person', {filter, limit: DEFAULT_PAGE_SIZE_SMALL});

  selectedPeoples.value = list.data.map(person => person.handle).filter((handle): handle is number => handle !== null) || [];
}
   
async function loadCompanies(search = '', page = 1) {
    const filter = search ? { name: { $like: `%${search}%` } } : {};
    companies.value = await ApiGenericService.find<CompanyItem>('company', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
}

function togglePerson(handle: number) {
  const idx = selectedPeoples.value.indexOf(handle)
  if (idx === -1) selectedPeoples.value.push(handle)
  else selectedPeoples.value.splice(idx, 1)
}

function toggleCompany(handle: number) {
  const idx = selectedCompanies.value.indexOf(handle)
  if (idx === -1) selectedCompanies.value.push(handle)
  else selectedCompanies.value.splice(idx, 1)

  loadPeopleByCompany();
}
//#endregion

//#region Events
function onPeopleSearch(val: string) {
    peopleSearch.value = val;

    if(peoples.value){
        peoples.value.meta.page = 1;
        loadPeople(val, peoples.value.meta.page);
    }
}

function onCompaniesSearch(val: string) {
    companiesSearch.value = val;
    if(companies.value){
        companies.value.meta.page = 1;
        loadCompanies(val, companies.value.meta.page);
  }
}

function onPeoplePage(page: number) {
    if(peoples.value){
        peoples.value.meta.page = page;
        loadPeople(peopleSearch.value, page);
    }
}

function onCompaniesPage(page: number) {
    if(companies.value){
        companies.value.meta.page = page;
        loadCompanies(companiesSearch.value, page);
  }
}
//#endregion
</script>