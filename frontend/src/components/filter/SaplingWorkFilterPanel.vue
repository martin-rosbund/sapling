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

        <div v-if="props.showCloseAction" class="sapling-work-filter-panel__header-actions">
          <v-btn
            icon
            size="small"
            variant="text"
            :title="props.closeActionLabel || 'Schliessen'"
            :aria-label="props.closeActionLabel || 'Schliessen'"
            @click="emit('close')"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
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

            <v-expansion-panel v-if="companyPeoples">
              <v-expansion-panel-title>
                <v-list-subheader>{{ $t('global.employee') }}</v-list-subheader>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <SaplingFilterEmployee
                  :companyPeoples="companyPeoples"
                  :employeeSearch="employeeSearch"
                  :isPersonSelected="isPersonSelected"
                  :getPersonId="getPersonId"
                  :getPersonName="getPersonName"
                  @togglePerson="togglePerson"
                  @searchEmployees="onEmployeeSearch"
                  @pageEmployees="onEmployeePage"
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

            <v-expansion-panel v-for="chipFilter in chipFilters" :key="chipFilter.key">
              <v-expansion-panel-title>
                <v-list-subheader>{{ chipFilter.label }}</v-list-subheader>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="sapling-chip-filter">
                  <div
                    v-for="option in chipFilter.options"
                    :key="`${chipFilter.key}-${option.handle}`"
                    class="sapling-vertical-item"
                    :class="{ selected: isChipFilterOptionSelected(chipFilter.key, option.handle) }"
                    @click="toggleChipFilterOption(chipFilter.key, option.handle)"
                  >
                    <span
                      v-if="option.color"
                      class="sapling-chip-filter__swatch"
                      :style="{ backgroundColor: option.color }"
                    />
                    <v-icon v-else-if="option.icon" size="18" class="sapling-chip-filter__icon">
                      {{ option.icon }}
                    </v-icon>
                    <span class="sapling-person-name">{{ option.label }}</span>
                    <v-checkbox
                      :model-value="isChipFilterOptionSelected(chipFilter.key, option.handle)"
                      hide-details
                      density="comfortable"
                      class="sapling-filter-checkbox checkbox-no-pointer"
                      :ripple="false"
                      @click.stop
                      @update:model-value="
                        (checked) => toggleChipFilterOption(chipFilter.key, option.handle, checked)
                      "
                    />
                  </div>
                </div>
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
import { computed } from 'vue'
import SaplingFilterMe from '@/components/filter/SaplingFilterMe.vue'
import SaplingFilterEmployee from '@/components/filter/SaplingFilterEmployee.vue'
import SaplingFilterPerson from '@/components/filter/SaplingFilterPerson.vue'
import SaplingFilterCompany from '@/components/filter/SaplingFilterCompany.vue'
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork'
import type {
  SaplingChipFilterGroup,
  SaplingChipFilterSelection,
  SaplingFilterHandle,
} from '@/components/filter/saplingWorkFilter.types'
// #endregion

// #region Props
const props = defineProps<{
  showCloseAction?: boolean
  closeActionLabel?: string
  chipFilters?: SaplingChipFilterGroup[]
  selectedChipFilters?: SaplingChipFilterSelection
}>()
// #endregion

// #region Emits
const emit = defineEmits<{
  (event: 'update:selectedPeoples', value: string[]): void
  (event: 'update:selectedCompanies', value: string[]): void
  (event: 'update:selectedChipFilters', value: SaplingChipFilterSelection): void
  (event: 'close'): void
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
  onEmployeeSearch,
  onPeopleSearch,
  onCompaniesSearch,
  onEmployeePage,
  onPeoplePage,
  onCompaniesPage,
  ownPerson,
  peoples,
  companies,
  companyPeoples,
  employeeSearch,
  peopleSearch,
  companiesSearch,
  expandedPanels,
} = useSaplingFilterWork({
  onSelectedPeoplesChange: (values) => emit('update:selectedPeoples', values.map(String)),
  onSelectedCompaniesChange: (values) => emit('update:selectedCompanies', values.map(String)),
})
// #endregion

const chipFilters = computed(() => props.chipFilters ?? [])
const selectedChipFilters = computed(() => props.selectedChipFilters ?? {})

function isChipFilterOptionSelected(groupKey: string, handle: SaplingFilterHandle): boolean {
  return selectedChipFilters.value[groupKey]?.includes(handle) === true
}

function toggleChipFilterOption(
  groupKey: string,
  handle: SaplingFilterHandle,
  checked?: boolean | null,
): void {
  const currentSelection = selectedChipFilters.value[groupKey] ?? []
  const isSelected = currentSelection.includes(handle)

  if (checked === true || (checked == null && !isSelected)) {
    emit('update:selectedChipFilters', {
      ...selectedChipFilters.value,
      [groupKey]: isSelected ? currentSelection : [...currentSelection, handle],
    })
    return
  }

  if (checked === false || (checked == null && isSelected)) {
    emit('update:selectedChipFilters', {
      ...selectedChipFilters.value,
      [groupKey]: currentSelection.filter((selectedHandle) => selectedHandle !== handle),
    })
  }
}
</script>
