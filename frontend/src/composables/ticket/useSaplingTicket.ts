import { ref, computed, watch, onMounted } from 'vue';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '@/services/api.generic.service';
import { useGenericStore } from '@/stores/genericStore';
import { DEFAULT_PAGE_SIZE_MEDIUM, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { TicketItem, PersonItem, CompanyItem } from '@/entity/entity';
import type { PaginatedResponse, TableOptionsItem, TicketHeaderItem } from '@/entity/structure';
import { i18n } from '@/i18n';
export function useSaplingTicket() {
  const genericStore = useGenericStore();
  const key = 'ticket|global';
  genericStore.loadGeneric(key, 'ticket', 'global');
  const entity = computed(() => genericStore.getState(key).entity);
  const entityPermission = computed(() => genericStore.getState(key).entityPermission);
  const entityTemplates = computed(() => genericStore.getState(key).entityTemplates);
  const isLoading = computed(() => genericStore.getState(key).isLoading);

  const isInitialized = ref<boolean>(false);
  const ownPerson = ref<PersonItem | null>(null);
  const expandedRows = ref<string[]>([]);
  const emptyMeta = { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE_SMALL, totalPages: 0 };
  const tickets = ref<PaginatedResponse<TicketItem>>({ data: [], meta: { ...emptyMeta } });
  const peoples = ref<PaginatedResponse<PersonItem>>({ data: [], meta: { ...emptyMeta } });
  const companies = ref<PaginatedResponse<CompanyItem>>({ data: [], meta: { ...emptyMeta } });
  const companyPeoples = ref<PaginatedResponse<PersonItem>>({ data: [], meta: { ...emptyMeta } });
  const selectedPeoples = ref<number[]>([]);
  const selectedCompanies = ref<number[]>([]);
  const peopleSearch = ref('');
  const companiesSearch = ref('');
  const tableOptions = ref<TableOptionsItem>({
    page: 1,
    itemsPerPage: DEFAULT_PAGE_SIZE_MEDIUM,
    sortBy: [],
    sortDesc: [],
  });

  // Lifecycle
  onMounted(async () => {
    await setOwnPerson();
    await loadPeople();
    await loadCompanies();
    await loadCompanyPeople(ownPerson.value);
    isInitialized.value = true;
  });

  watch(selectedPeoples, () => {
    if (!isInitialized.value) return;
    loadTickets();
  }, { deep: true });

  function onTableOptionsUpdate(options: TableOptionsItem) {
    tableOptions.value = options;
    loadTickets();
  }
  // Tickets
  const ticketHeaders = computed<TicketHeaderItem[]>(() => {
    if (isLoading.value) return [];
    // Actions column first
    const actionsHeader: TicketHeaderItem = {
      key: '__actions',
      title: '',
      width: 48
    };
    const dataHeaders = (entityTemplates.value as any[])
      .filter((t: any) => !t.isAutoIncrement && !t.isSystem && t.name !== 'problemDescription' && t.name !== 'solutionDescription' && t.name !== 'timeTrackings')
      .map((t: any): TicketHeaderItem => ({
        key: t.name,
        title: i18n.global.t(`ticket.${t.name}`),
        width: t.length ? Number(t.length) : undefined
      }));
    return [actionsHeader, ...dataHeaders];
  });

  async function loadTickets() {
    const filter = { assignee: { $in: selectedPeoples.value } };
    const { page, itemsPerPage, sortBy, sortDesc } = tableOptions.value;
    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    const sortDescArr = Array.isArray(sortDesc) ? sortDesc : [];
    const sortByArr = Array.isArray(sortBy) ? sortBy : [];
    sortByArr.forEach((item: { key?: string; name?: string } | string, i: number) => {
      const key = typeof item === 'string' ? item : item.key || item.name || '';
      if (key) {
        orderBy[key] = sortDescArr[i] ? 'DESC' : 'ASC';
      }
    });
    const response = await ApiGenericService.find<TicketItem>('ticket', {
      filter,
      relations: ['m:1'],
      page,
      limit: itemsPerPage,
      orderBy,
    });
    tickets.value = response;
  }

  // Formatter
  function formatRichText(text: string | undefined | null): string {
    if (!text) return '';
    const html = text
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    return html;
  }
  function formatDateTime(date: string | Date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // People & Company
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
    const idx = selectedPeoples.value.indexOf(handle)
    if (idx === -1) selectedPeoples.value.push(handle)
    else selectedPeoples.value.splice(idx, 1)
  }
  function toggleCompany(handle: number) {
    const idx = selectedCompanies.value.indexOf(handle)
    if (idx === -1) selectedCompanies.value.push(handle)
    else selectedCompanies.value.splice(idx, 1)
    loadPeopleByCompany();
  }

  // Events
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

  return {
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
    entityPermission,
    entityTemplates,
    entity,
    tableOptions,
    ticketHeaders,
    loadTickets,
    onTableOptionsUpdate,
    formatRichText,
    formatDateTime,
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
  };
}
