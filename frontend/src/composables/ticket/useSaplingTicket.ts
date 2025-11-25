import { ref, computed, watch, onMounted } from 'vue';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '@/services/api.generic.service';
import { useGenericStore } from '@/stores/genericStore';
import { DEFAULT_PAGE_SIZE_MEDIUM, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { TicketItem, PersonItem, CompanyItem } from '@/entity/entity';
import type { PaginatedResponse, SortItem } from '@/entity/structure';

// Erweiterung für TableOptionsItem, damit search und SortItem[] unterstützt werden
interface TableOptionsItem {
  page: number;
  itemsPerPage: number;
  sortBy: SortItem[];
  sortDesc: boolean[];
  search?: string;
}
import { i18n } from '@/i18n';

export function useSaplingTicket() {
  
  // #region State
  const entity = computed(() => genericStore.getState('ticket').entity);
  const entityPermission = computed(() => genericStore.getState('ticket').entityPermission);
  const entityTemplates = computed(() => genericStore.getState('ticket').entityTemplates);
  const isLoading = computed(() => genericStore.getState('ticket').isLoading);
  const isInitialized = ref<boolean>(false);
  const ownPerson = ref<PersonItem | null>(null);
  const expandedRows = ref<string[]>([]);
  const emptyMeta = { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE_SMALL, totalPages: 0, executionTime: 0 };
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
    sortBy: [], // SortItem[]
    sortDesc: [],
    search: '',
  });
  // #endregion

  // #region Entity Loader
  const genericStore = useGenericStore();
  genericStore.loadGeneric('ticket', 'global');
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await setOwnPerson();
    await loadPeople();
    await loadCompanies();
    await loadCompanyPeople(ownPerson.value);
    isInitialized.value = true;
  });

  watch([selectedPeoples, isInitialized, tableOptions], () => {
    if (!isInitialized.value) return;
    loadTickets();
  }, { deep: true });
  
  // Reload data when search, page, itemsPerPage, or sortBy changes
  //watch([search, page, itemsPerPage, sortBy], loadTickets);
  // #endregion

  // #region Tickets
  const ticketHeaders = computed(() => {
    if (isLoading.value) return [];
    // Actions column as first column
    const actionsHeader = {
      key: '__actions',
      title: '',
      width: 48,
      type: 'actions',
      kind: '',
      isPrimaryKey: false,
      isNullable: true,
      isUnique: false,
      referenceName: '',
      referencedPks: [],
      headerProps: {},
      cellProps: {},
      isAutoIncrement: false,
      mappedBy: '',
      inversedBy: '',
      isReference: false,
      isEnum: false,
      enumValues: [],
      isArray: false,
      isSystem: false,
      isRequired: false,
      nullable: true,
      isShowInCompact: false,
      isColor: false,
      isIcon: false,
      isChip: false,
    };
    // Use entityTemplates directly, filter only unwanted system columns
    const dataHeaders = (entityTemplates.value)
      .filter((t) => !t.isAutoIncrement && !t.isSystem && t.name !== 'problemDescription' && t.name !== 'solutionDescription' && t.name !== 'timeTrackings' && t.name !== '__actions')
      .map((t) => ({
        ...t,
        key: t.name,
        title: i18n.global.t(`ticket.${t.name}`)
      }));
    return [actionsHeader, ...dataHeaders];
  });

  async function loadTickets() {
    // Filter wie in useSaplingTable: search + selectedPeoples
    let filter: Record<string, unknown> = {};

    if(tableOptions.value.search){
      filter = tableOptions.value.search
        ? { $or: entityTemplates.value.filter((x) => !x.isReference).map((t) => ({ [t.name]: { $like: `%${tableOptions.value.search}%` } })) }
        : {};
    }
    
    // Assignee-Filter wie gehabt
    if (selectedPeoples.value.length > 0) {
      filter = { ...filter, assignee: { $in: selectedPeoples.value } };
    }

    // Sortierung wie in useSaplingTable
    const orderBy: Record<string, string> = {};
    (tableOptions.value.sortBy || []).forEach(sort => {
      orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
    });

    const response = await ApiGenericService.find<TicketItem>('ticket', {
      filter,
      relations: ['m:1'],
      page: tableOptions.value.page,
      limit: tableOptions.value.itemsPerPage,
      orderBy,
    });
    tickets.value = response;
  }
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
  // #endregion

  // #region Event Handlers
  function onTableOptionsUpdate(options: TableOptionsItem) {
    tableOptions.value = options;
  }

function onSearchUpdate(val: string) {
  tableOptions.value.search = val;
  tableOptions.value.page = 1;
}

  function onPageUpdate(val: number) {
    tableOptions.value.page = val;
    tableOptions.value.page = val;
  }

  function onItemsPerPageUpdate(val: number) {
    tableOptions.value.itemsPerPage = val;
    tableOptions.value.page = 1;
  }

  function onSortByUpdate(val: unknown) {
    tableOptions.value.sortBy = val as { key: string; order?: "asc" | "desc" | undefined; }[];
  }

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

  // #region Return
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
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onSortByUpdate,
    loadTickets,
    onTableOptionsUpdate,
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
  // #endregion
}
