<template>
  <section class="sapling-work-filter-panel glass-panel">
    <template v-if="isLoading">
      <div class="sapling-work-filter-skeleton">
        <div class="sapling-work-filter-skeleton__header">
          <v-skeleton-loader type="heading" />
        </div>

        <div class="sapling-work-filter-skeleton__content">
          <v-skeleton-loader
            v-for="item in 4"
            :key="item"
            class="sapling-work-filter-skeleton__panel"
            type="list-item-three-line"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="sapling-work-filter-panel__header">
        <div class="sapling-work-filter-panel__headline">
          <v-icon>mdi-account-group</v-icon>
          <span>{{ $t('navigation.person') + ' & ' + $t('navigation.company') }}</span>
        </div>
      </div>

      <div class="sapling-work-filter-panel__content sapling-scrollable">
        <div class="sapling-accordion-scroll-wrapper">
          <v-expansion-panels v-model="expandedPanels" multiple>
            <v-expansion-panel v-if="ownPerson">
              <v-expansion-panel-title>
                <v-list-subheader>{{ $t('global.me') }}</v-list-subheader>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <SaplingFilterMe
                  :ownPerson="ownPerson"
                  :isPersonSelected="isPersonSelected"
                  :getPersonId="getPersonId"
                  :getPersonName="getPersonName"
                  @togglePerson="togglePerson"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel v-if="companyPeoples?.data && companyPeoples.data.length > 0">
              <v-expansion-panel-title>
                <v-list-subheader>{{ $t('global.employee') }}</v-list-subheader>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <SaplingFilterEmployee
                  :companyPeoples="companyPeoples"
                  :isPersonSelected="isPersonSelected"
                  :getPersonId="getPersonId"
                  :getPersonName="getPersonName"
                  @togglePerson="togglePerson"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-list-subheader>{{ $t('navigation.person') }}</v-list-subheader>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <SaplingFilterPerson
                  :people="peoples"
                  :peopleSearch="peopleSearch"
                  :isPersonSelected="isPersonSelected"
                  :getPersonId="getPersonId"
                  :getPersonName="getPersonName"
                  @togglePerson="togglePerson"
                  @searchPeople="onPeopleSearch"
                  @pagePeople="onPeoplePage"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-list-subheader>{{ $t('navigation.company') }}</v-list-subheader>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <SaplingFilterCompany
                  :companies="companies"
                  :companiesSearch="companiesSearch"
                  :isCompanySelected="isCompanySelected"
                  @toggleCompany="toggleCompany"
                  @searchCompanies="onCompaniesSearch"
                  @pageCompanies="onCompaniesPage"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
// #region Imports
import SaplingFilterMe from '@/components/filter/SaplingFilterMe.vue'
import SaplingFilterEmployee from '@/components/filter/SaplingFilterEmployee.vue'
import SaplingFilterPerson from '@/components/filter/SaplingFilterPerson.vue'
import SaplingFilterCompany from '@/components/filter/SaplingFilterCompany.vue'
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork'
// #endregion

// #region Emits
const emit = defineEmits<{
  (event: 'update:selectedPeoples', value: string[]): void
  (event: 'update:selectedCompanies', value: string[]): void
}>()
// #endregion

// #region Composable
const {
  isLoading,
  isPersonSelected,
  getPersonId,
  getPersonName,
  isCompanySelected,
  togglePerson,
  toggleCompany,
  onPeopleSearch,
  onCompaniesSearch,
  onPeoplePage,
  onCompaniesPage,
  ownPerson,
  peoples,
  companies,
  companyPeoples,
  peopleSearch,
  companiesSearch,
  expandedPanels,
} = useSaplingFilterWork({
  onSelectedPeoplesChange: (values) => emit('update:selectedPeoples', values.map(String)),
  onSelectedCompaniesChange: (values) => emit('update:selectedCompanies', values.map(String)),
})
// #endregion
</script>
