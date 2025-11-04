
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
                  :expanded="localExpandedRows"
                  @update:expanded="onExpandedRowsUpdate"
                  :item-value="'handle'"
                  single-expand
                  @update:options="onTableOptionsUpdate"
                >
                  <template #item.status="slotProps">
                    <v-chip :color="(slotProps.item as any)?.status?.color" small>{{ (slotProps.item as any)?.status?.description }}</v-chip>
                  </template>
                  <template #item.assignee="slotProps">
                    <v-icon left small>mdi-account</v-icon>
                    {{ (slotProps.item as any)?.assignee ? ((slotProps.item as any).assignee.firstName + ' ' + (slotProps.item as any).assignee.lastName) : '' }}
                  </template>
                  <template #item.creator="slotProps">
                    <v-icon left small>mdi-account</v-icon>
                    {{ (slotProps.item as any)?.creator ? ((slotProps.item as any).creator.firstName + ' ' + (slotProps.item as any).creator.lastName) : '' }}
                  </template>
                  <template #item.company="slotProps">
                    <v-icon left small>mdi-domain</v-icon>
                    {{ (slotProps.item as any)?.assignee && (slotProps.item as any).assignee.company ? (slotProps.item as any).assignee.company.name : '' }}
                  </template>
                  <template #item.priority="slotProps">
                    <v-chip v-if="(slotProps.item as any)?.priority" :color="(slotProps.item as any).priority.color" small>{{ (slotProps.item as any).priority.description }}</v-chip>
                  </template>
                  <template #item.startDate="slotProps">
                    <span v-if="(slotProps.item as any)?.startDate">{{ formatDateTime((slotProps.item as any).startDate) }}</span>
                  </template>
                  <template #item.endDate="slotProps">
                    <span v-if="(slotProps.item as any)?.endDate">{{ formatDateTime((slotProps.item as any).endDate) }}</span>
                  </template>
                  <template #item.deadlineDate="slotProps">
                    <span v-if="(slotProps.item as any)?.deadlineDate">{{ formatDateTime((slotProps.item as any).deadlineDate) }}</span>
                  </template>
                  <template #expanded-row="slotProps">
                    <td :colspan="ticketHeaders.length">
                      <div v-if="(slotProps.item as any)?.problemDescription" class="sapling-ticket-problem-description">
                        <v-card outlined class="sapling-ticket-problem-card mb-2 pa-2">
                          <v-card-title class="sapling-ticket-problem-title pa-1 pb-0">
                            <v-icon left color="error" size="18">mdi-alert-circle</v-icon>
                            {{ $t('ticket.problemDescription') }}
                          </v-card-title>
                          <v-card-text class="sapling-ticket-description-preline pa-2">
                            <div v-html="formatRichText((slotProps.item as any).problemDescription)"></div>
                          </v-card-text>
                        </v-card>
                      </div>
                      <div v-if="(slotProps.item as any)?.solutionDescription">
                        <v-card outlined class="sapling-ticket-solution-card pa-2">
                          <v-card-title class="sapling-ticket-solution-title pa-1 pb-0">
                            <v-icon left color="success" size="18">mdi-lightbulb-on</v-icon>
                            {{ $t('ticket.solutionDescription') }}
                          </v-card-title>
                          <v-card-text class="sapling-ticket-description-preline pa-2">
                            <div v-html="formatRichText((slotProps.item as any).solutionDescription)"></div>
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

<script lang="ts" setup>
// #region Imports
import { toRefs, ref, watch } from 'vue';
import SaplingWorkFilter from '../filter/SaplingWorkFilter.vue';
import '@/assets/styles/SaplingTicket.css';
import { DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { CompanyItem, EntityItem, PersonItem, TicketItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';
// #endregion

// #region Props and Emits
const props = defineProps<{
  ownPerson: PersonItem | null,
  expandedRows: string[],
  isLoading: boolean,
  tickets: PaginatedResponse<TicketItem>,
  peoples: PaginatedResponse<PersonItem>,
  companies: PaginatedResponse<CompanyItem>,
  companyPeoples: PaginatedResponse<PersonItem>,
  selectedPeoples: number[],
  selectedCompanies: number[],
  peopleSearch: string,
  companiesSearch: string,
  entity: EntityItem,
  tableOptions: any,
  ticketHeaders: any[],
  formatRichText: (text: string | undefined | null) => string,
  formatDateTime: (date: string | Date) => string,
}>();

const emit = defineEmits([
  'update:expandedRows',
  'update:tableOptions',
  'togglePerson',
  'toggleCompany',
  'searchPeople',
  'searchCompanies',
  'pagePeople',
  'pageCompanies',
]);

const {
  ownPerson,
  expandedRows,
  isLoading,
  tickets,
  peoples,
  companies,
  companyPeoples,
  selectedPeoples,
  selectedCompanies,
  peopleSearch,
  companiesSearch,
  entity,
  tableOptions,
  ticketHeaders,
  formatRichText,
  formatDateTime,
} = toRefs(props);

const localExpandedRows = ref([...expandedRows.value]);
// Sync localExpandedRows with prop if parent changes
watch(expandedRows, (val) => {
  localExpandedRows.value = [...val];
});
// #endregion

function onTableOptionsUpdate(options: any) {
  emit('update:tableOptions', options);
}
function onExpandedRowsUpdate(val: string[]) {
  localExpandedRows.value = [...val];
  emit('update:expandedRows', [...val]);
}
function togglePerson(handle: number) {
  emit('togglePerson', handle);
}
function toggleCompany(handle: number) {
  emit('toggleCompany', handle);
}
function onPeopleSearch(val: string) {
  emit('searchPeople', val);
}
function onCompaniesSearch(val: string) {
  emit('searchCompanies', val);
}
function onPeoplePage(page: number) {
  emit('pagePeople', page);
}
function onCompaniesPage(page: number) {
  emit('pageCompanies', page);
}
</script>