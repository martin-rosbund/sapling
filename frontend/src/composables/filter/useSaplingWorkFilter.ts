import { onMounted, ref } from 'vue';
import type { CompanyItem, PersonItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '@/services/api.generic.service';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';

export function useSaplingWorkFilter() {

    // #region State
    const ownPerson = ref<PersonItem | null>(null);
    const peoples = ref<PaginatedResponse<PersonItem>>();
    const companies = ref<PaginatedResponse<CompanyItem>>();
    const companyPeoples = ref<PaginatedResponse<PersonItem>>();
    const selectedPeoples = ref<number[]>([]);
    const selectedCompanies = ref<number[]>([]);
    const peopleSearch = ref('');
    const companiesSearch = ref('');
    const expandedPanels = ref([0, 1]);
    // #endregion

  function isPersonSelected(id: number) {
    if (selectedPeoples.value) return selectedPeoples.value.includes(id);
    return false;
  }

  function getPersonId(person: PersonItem): number {
    return person.handle || 0;
  }

  function getPersonName(person: PersonItem): string {
    return person.firstName + ' ' + person.lastName;
  }

  function isCompanySelected(id: number) {
    if (selectedCompanies.value) return selectedCompanies.value.includes(id);
    return false;
  }

  // #region Lifecycle
  onMounted(async () => {
    await setOwnPerson();
    await loadPeople();
    await loadCompanies();
    await loadCompanyPeople(ownPerson.value);
  });
  // #endregion

  // #region People & Company
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
    const arr = selectedPeoples.value.slice();
    const idx = arr.indexOf(handle);
    if (idx === -1) arr.push(handle);
    else arr.splice(idx, 1);
    selectedPeoples.value = arr;
  }

  function toggleCompany(handle: number) {
    const arr = selectedCompanies.value.slice();
    const idx = arr.indexOf(handle);
    if (idx === -1) arr.push(handle);
    else arr.splice(idx, 1);
    selectedCompanies.value = arr;
    loadPeopleByCompany();
  }
  // #endregion

  // #region Event Handlers
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

  // #endregion
  
  return {
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
    selectedPeoples,
    selectedCompanies,
    peopleSearch,
    companiesSearch,
    expandedPanels,
  };
}
