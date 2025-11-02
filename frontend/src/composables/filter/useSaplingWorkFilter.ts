import { ref } from 'vue';
import type { CompanyItem, PersonItem } from '@/entity/entity';

export function useSaplingWorkFilter(props: {
  people: PersonItem[];
  companies: CompanyItem[];
  companyPeople?: PersonItem[];
  ownPerson?: PersonItem | null;
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
}, emit: (event: 'togglePerson' | 'toggleCompany' | 'searchPeople' | 'searchCompanies' | 'pagePeople' | 'pageCompanies', ...args: any[]) => void) {
  const COMPANY_PREFIX = 'company-';
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
  const expandedPanels = ref([0, 1]);
  return {
    isPersonSelected,
    getPersonId,
    getPersonName,
    isCompanySelected,
    togglePerson,
    toggleCompany,
    expandedPanels,
  };
}
