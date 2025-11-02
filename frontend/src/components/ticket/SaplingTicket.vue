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

// #region Imports
import '@/assets/styles/SaplingTicket.css';
import { useSaplingTicket } from '@/composables/ticket/useSaplingTicket';
import SaplingWorkFilter from '../filter/SaplingWorkFilter.vue';
// #endregion

// #region Composable
import { DEFAULT_PAGE_SIZE_MEDIUM, DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
const {
  translationService,
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
  templates,
  entity,
  tableOptions,
  ticketHeaders,
  loadTickets,
  onTableOptionsUpdate,
  formatRichText,
  formatDateTime,
  loadTemplates,
  loadEntity,
  loadTranslations,
  setOwnPerson,
  loadPeople,
  loadCompanyPeople,
  loadPeopleByCompany,
  loadCompanies,
  togglePerson,
  toggleCompany,
  onPeopleSearch,
  onCompaniesSearch,
  onPeoplePage,
  onCompaniesPage,
} = useSaplingTicket();
// #endregion

</script>