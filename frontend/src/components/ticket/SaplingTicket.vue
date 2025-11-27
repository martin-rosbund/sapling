
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
            <v-card-text class="sapling-ticket-table-text pa-0 flex-grow-1">
              <div class="sapling-ticket-table-scroll">
                  <SaplingTable
                    :items="tickets?.data || []"
                    :search="tableOptions.search ?? ''"
                    :page="tableOptions.page"
                    :items-per-page="tableOptions.itemsPerPage"
                    :total-items="tickets?.meta?.total || 0"
                    :is-loading="isLoading"
                    :sort-by="tableOptions.sortBy"
                    :entity-name="entity?.handle || ''"
                    :entity="entity"
                    :entity-permission="entityPermission"
                    :entity-templates="entityTemplates || []"
                    :show-actions="true"
                    table-key="ticket-table"
                    @update:search="onSearchUpdate"
                    @update:page="onPageUpdate"
                    @update:items-per-page="onItemsPerPageUpdate"
                    @update:sort-by="onSortByUpdate"
                    @reload="onTableOptionsUpdate"
                  />
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
// Props werden von der Parent-Komponente (TicketView.vue) übergeben
import type { PersonItem, EntityItem, TicketItem, CompanyItem } from '@/entity/entity';
import type { AccumulatedPermission, EntityTemplate, PaginatedResponse, TableOptionsItem } from '@/entity/structure';

interface SaplingTicketProps {
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
  entity: EntityItem | null,
  entityPermission: AccumulatedPermission | null,
  entityTemplates: EntityTemplate[],
  tableOptions: TableOptionsItem,
  onSearchUpdate: (search: string) => void,
  onPageUpdate: (page: number) => void,
  onItemsPerPageUpdate: (itemsPerPage: number) => void,
  onSortByUpdate: (sortBy: string[]) => void,
  togglePerson: (personId: number) => void,
  toggleCompany: (companyId: number) => void,
  onPeopleSearch: (search: string) => void,
  onCompaniesSearch: (search: string) => void,
  onPeoplePage: (page: number) => void,
  onCompaniesPage: (page: number) => void,
  onTableOptionsUpdate: (options: TableOptionsItem) => void,
}

defineProps<SaplingTicketProps>();

// #region Imports
import { defineAsyncComponent } from 'vue';
import SaplingWorkFilter from '../filter/SaplingWorkFilter.vue';
import '@/assets/styles/SaplingTicket.css';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
// #endregion

const SaplingTable = defineAsyncComponent(() => import('../table/SaplingTable.vue'));
</script>