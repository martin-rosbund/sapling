
<template>
  <v-container class="sapling-ticket-container pa-0 no-gutters" fluid>
    <v-skeleton-loader
      v-if="isLoading"
      elevation="12"
      class="fill-height glass-panel"
      type="article, actions, table"/>
    <template v-else>
      <v-row class="sapling-ticket-row fill-height" no-gutters>
        <!-- Ticketliste -->
        <v-col cols="12" md="9" class="sapling-ticket-main-table-col d-flex flex-column">
          <v-card flat class="sapling-ticket-main-table-card rounded-0 d-flex flex-column transparent">
            <v-card-title class="sapling-ticket-main-table-title">
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
                  :sort-asc="tableOptions.sortBy"
                  :sort-desc="tableOptions.sortDesc"
                  class="sapling-ticket-table elevation-0 glass-table"
                  dense
                  :footer-props="{ itemsPerPageOptions: DEFAULT_PAGE_SIZE_OPTIONS }"
                  show-expand
                  :expanded="localExpandedRows"
                  @update:expanded="onExpandedRowsUpdate"
                  :item-value="'handle'"
                  single-expand
                  @update:options="onTableOptionsUpdate"
                >
                  <template #item="{ item, columns, index }">
                    <SaplingTicketRow
                      :ticket="item"
                      :headers="columns"
                      :index="index"
                      :selected-row="null"
                      :expanded-row="localExpandedRows.includes(String(item.handle)) ? String(item.handle) : ''"
                      :show-actions="true"
                      :entity="entity"
                      :entity-permission="entityPermission"
                      :format-rich-text="formatRichText"
                      :format-date-time="formatDateTime"
                      @expand="handleExpandRow"
                    />
                  </template>
                </v-data-table-server>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Personen-/Firmenliste (Filter) -->
        <v-col cols="12" md="3" class="sapling-ticket-sideboard sideboard d-flex flex-column">
          <v-card class="sapling-ticket-sideboard-card sideboard-card rounded-0 d-flex flex-column transparent" flat>
            <v-card-title class="sapling-ticket-sideboard-title text-white">
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
import { ref, watch } from 'vue';
import SaplingWorkFilter from '../filter/SaplingWorkFilter.vue';
import SaplingTicketRow from './SaplingTicketRow.vue';
import '@/assets/styles/SaplingTicket.css';
import { DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import { useSaplingTicket } from '@/composables/ticket/useSaplingTicket';
// #endregion

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
  entityPermission,
  tableOptions,
  ticketHeaders,
  formatRichText,
  formatDateTime,
  togglePerson,
  toggleCompany,
  onPeopleSearch,
  onCompaniesSearch,
  onPeoplePage,
  onCompaniesPage,
  onTableOptionsUpdate,
} = useSaplingTicket();

const localExpandedRows = ref(expandedRows.value.map(h => String(h)));
// Sync localExpandedRows with prop if parent changes
watch(expandedRows, (val) => {
  localExpandedRows.value = val.map(h => String(h));
});

function handleExpandRow(handle: string | number) {
  const strHandle = String(handle);
  if (localExpandedRows.value.includes(strHandle)) {
    localExpandedRows.value = localExpandedRows.value.filter(h => h !== strHandle);
  } else {
    localExpandedRows.value = [strHandle]; // single expand
  }
}

function onExpandedRowsUpdate(val: string[]) {
  localExpandedRows.value = val.map(h => String(h));
}

</script>