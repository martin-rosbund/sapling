<template>
  <v-list dense class="person-company-list">
    <!-- Personenbereich -->
    <div class="person-section">
      <v-list-subheader>{{$t('navigation.person')}}</v-list-subheader>
        <div class="section-padding-bottom">
          <v-text-field
            :model-value="props.peopleSearch ?? ''"
            :label="$t ? $t('global.search') : 'Suchen'"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            single-line
            density="compact"
            class="margin-bottom-4"
            @update:model-value="val => emit('searchPeople', val)"
          />
        </div>
      <div>
        <div
          v-for="person in people"
          :key="'person-' + getPersonId(person)"
          class="vertical-item compact-item"
          :class="{ 'selected': isPersonSelected(getPersonId(person)) }"
          @click="togglePerson(getPersonId(person))">
          <v-icon class="mr-1" size="20">mdi-account</v-icon>
          <span class="person-name">{{ getPersonName(person) }}</span>
          <v-checkbox
            :model-value="isPersonSelected(getPersonId(person))"
            @update:model-value="checked => togglePerson(getPersonId(person), checked)"
            hide-details
            density="comfortable"
            class="ml-1 checkbox-no-pointer compact-checkbox"
            
            @click.stop
            :ripple="false"
          />
        </div>
      </div>
    <div class="section-padding-top">
        <v-pagination
          v-if="(peopleTotal ?? 0) > (props.peoplePageSize)"
          :model-value="props.peoplePage ?? 1"
          :length="Math.ceil((peopleTotal ?? 0) / (props.peoplePageSize))"
          @update:model-value="val => emit('pagePeople', val)"
          density="compact"
          class="margin-4-0"
        />
      </div>
    </div>
    <v-divider class="my-2"></v-divider>
    <!-- Firmenbereich -->
    <div v-if="companies && companies.length > 0" class="company-section">
      <v-list-subheader>{{$t('navigation.company')}}</v-list-subheader>
    <div class="section-padding-bottom">
        <v-text-field
          :model-value="props.companiesSearch ?? ''"
          :label="$t ? $t('global.search') : 'Suchen'"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          single-line
          density="compact"
          class="margin-bottom-4"
          @update:model-value="val => emit('searchCompanies', val)"
        />
      </div>
    <div>
        <div
          v-for="company in companies"
          :key="'company-' + company.handle"
          class="vertical-item compact-item"
          :class="{ 'selected': isCompanySelected(company.handle) }"
          @click="toggleCompany(company.handle)">
          <v-icon class="mr-1" size="20">mdi-domain</v-icon>
          <span class="person-name">{{ company.name }}</span>
          <v-checkbox
            :model-value="isCompanySelected(company.handle)"
            @update:model-value="checked => toggleCompany(company.handle, checked)"
            hide-details
            density="comfortable"
            class="ml-1 checkbox-no-pointer compact-checkbox"
            
            @click.stop
            :ripple="false"
          />
        </div>
      </div>
    <div class="section-padding-top">
        <v-pagination
          v-if="(companiesTotal ?? 0) > (props.companiesPageSize ?? 25)"
          :model-value="props.companiesPage ?? 1"
          :length="Math.ceil((companiesTotal ?? 0) / (props.companiesPageSize ?? 25))"
          @update:model-value="val => emit('pageCompanies', val)"
          density="compact"
          class="margin-4-0"
        />
      </div>
    </div>
  </v-list>
</template>


<script setup lang="ts">
  // #region Imports
  import type { CompanyItem, PersonItem } from '@/entity/entity';
  import { defineProps, defineEmits } from 'vue';
  import '../assets/styles/PersonCompanyFilter.css';
  // #endregion Imports

  // #region Constants
  const COMPANY_PREFIX = 'company-';
  // #endregion Constants

  // #region Props & Emits
  const props = defineProps<{
    people: PersonItem[];
    companies: CompanyItem[];
    peopleTotal?: number;
    peopleSearch?: string;
    peoplePage?: number;
    peoplePageSize: number;
    companiesTotal?: number;
    companiesSearch?: string;
    companiesPage?: number;
    companiesPageSize: number;
    selectedPeople?: number[];
    selectedCompanies?: number[];
    selectedFilters?: (number | string)[];
  }>();

  const emit = defineEmits([
    'togglePerson',
    'toggleCompany',
    'searchPeople',
    'searchCompanies',
    'pagePeople',
    'pageCompanies',
  ]);
  // #endregion Props & Emits

  // #region Methods
  function isPersonSelected(id: number) {
    if (props.selectedPeople) return props.selectedPeople.includes(id);
    if (props.selectedFilters) return props.selectedFilters.includes(id);
    return false;
  }

  function getPersonId(person: PersonItem): number {
    return person.handle || 0;
  }

  function getPersonName(person: PersonItem): string {
    return person.firstName + ' ' + person.lastName;
  }

  function isCompanySelected(id: number) {
    if (props.selectedCompanies) return props.selectedCompanies.includes(id);
    if (props.selectedFilters) return props.selectedFilters.includes(COMPANY_PREFIX + id);
    return false;
  }

  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }

  function toggleCompany(id: number, checked?: boolean | null) {
    emit('toggleCompany', id, checked ?? undefined);
  }
  // #endregion Methods
</script>