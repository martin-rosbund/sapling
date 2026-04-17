<template>
  <SaplingDrawer v-model="drawerOpen">
    <v-card flat style="display: flex; flex-direction: column; height: 100%">
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
        <v-card-title
          class="sapling-partner-sideboard-title text-white d-flex align-center justify-space-between"
        >
          <v-icon left>mdi-account-group</v-icon>
          {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
        </v-card-title>
        <v-divider></v-divider>
        <div
          class="sapling-partner-sideboard-list-scroll d-flex flex-column"
          style="flex: 1 1 auto; overflow-y: auto; min-height: 0"
        >
          <div class="sapling-accordion-scroll-wrapper">
            <v-expansion-panels multiple v-model="expandedPanels">
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
    </v-card>
  </SaplingDrawer>
</template>

<script setup lang="ts">
// #region Imports
import { watch } from 'vue'
import SaplingDrawer from '@/components/common/SaplingDrawer.vue'
import SaplingFilterMe from '@/components/filter/SaplingFilterMe.vue'
import SaplingFilterEmployee from '@/components/filter/SaplingFilterEmployee.vue'
import SaplingFilterPerson from '@/components/filter/SaplingFilterPerson.vue'
import SaplingFilterCompany from '@/components/filter/SaplingFilterCompany.vue'
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork'
// #endregion

// #region Props
const props = withDefaults(
  defineProps<{
    modelValue?: boolean
  }>(),
  {
    modelValue: undefined,
  },
)
// #endregion

// #region Emits
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
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
  drawerOpen,
} = useSaplingFilterWork({
  onSelectedPeoplesChange: (values) => emit('update:selectedPeoples', values.map(String)),
  onSelectedCompaniesChange: (values) => emit('update:selectedCompanies', values.map(String)),
})

watch(
  () => props.modelValue,
  (value) => {
    if (typeof value === 'boolean' && value !== drawerOpen.value) {
      drawerOpen.value = value
    }
  },
  { immediate: true },
)

watch(drawerOpen, (value) => {
  emit('update:modelValue', value)
})
// #endregion
</script>

<style src="@/assets/styles/SaplingWorkFilter.css"></style>
