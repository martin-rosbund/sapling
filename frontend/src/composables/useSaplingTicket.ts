import { ref, computed, watch, onMounted } from 'vue';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '@/services/api.generic.service';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import { DEFAULT_PAGE_SIZE_MEDIUM, DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { TicketItem, PersonItem, CompanyItem, EntityItem } from '@/entity/entity';
import type { EntityTemplate, PaginatedResponse } from '@/entity/structure';

export function useSaplingTicket() {
  // State
  const translationService = ref(new TranslationService());
  const ownPerson = ref<PersonItem | null>(null);
  const expandedRows = ref<string[]>([]);
  const isLoading = ref(true);
  const tickets = ref<PaginatedResponse<TicketItem>>();
  const peoples = ref<PaginatedResponse<PersonItem>>();
  const companies = ref<PaginatedResponse<CompanyItem>>();
  const companyPeoples = ref<PaginatedResponse<PersonItem>>();
  const selectedPeoples = ref<number[]>([]);
  const selectedCompanies = ref<number[]>([]);
  const peopleSearch = ref('');
  const companiesSearch = ref('');
  const templates = ref<EntityTemplate[]>([]);
  const entity = ref<EntityItem | null>(null);
  const tableOptions = ref({
    page: 1,
    itemsPerPage: DEFAULT_PAGE_SIZE_MEDIUM,
    sortBy: [],
    sortDesc: [],
  });

  // Lifecycle
  onMounted(async () => {
    await setOwnPerson();
    await loadTranslations();
    loadEntity();
    loadPeople();
    loadCompanies();
    loadCompanyPeople(ownPerson.value);
    loadTickets();
    loadTemplates();
  });

  watch(() => i18n.global.locale.value, async () => {
    await loadTranslations();
  });

  watch(selectedPeoples, () => {
    loadTickets();
  }, { deep: true });

  // Tickets
  const ticketHeaders = computed(() => {
    return templates.value
      .filter(t => !t.isAutoIncrement && !t.isSystem && t.name !== 'problemDescription' && t.name !== 'solutionDescription' && t.name !== 'timeTrackings')
      .map(t => ({
        key: t.name,
        title: i18n.global.t(`ticket.${t.name}`),
        width: t.length ? Number(t.length) : undefined
      }));
  });

  async function loadTickets() {
    const filter = { assignee: { $in: selectedPeoples.value } };
    const { page, itemsPerPage, sortBy, sortDesc } = tableOptions.value;
    let orderBy: any = undefined;
    if (sortBy.length) {
      orderBy = {};
      sortBy.forEach((key: string, i: number) => {
        orderBy[key] = sortDesc[i] ? 'DESC' : 'ASC';
      });
    }
    const response = await ApiGenericService.find<TicketItem>('ticket', {
      filter,
      relations: ['m:1'],
      page,
      limit: itemsPerPage,
      orderBy,
    });
    tickets.value = response;
  }

  function onTableOptionsUpdate(options: any) {
    tableOptions.value = options;
    loadTickets();
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

  // Entity
  async function loadTemplates() {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/ticket`);
  }
  async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'ticket' }, limit: 1, page: 1 })).data[0] || null;
  }

  // Translations
  async function loadTranslations() {
    isLoading.value = true;
    await translationService.value.prepare('global', 'ticket');
    isLoading.value = false;
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
    translationService,
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
    templates,
    entity,
    tableOptions,
    ticketHeaders,
    loadTickets,
    onTableOptionsUpdate,
    formatRichText,
    formatDateTime,
    loadTemplates,
    loadEntity,
    loadTranslations,
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
