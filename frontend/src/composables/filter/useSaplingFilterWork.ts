import { computed, onMounted, ref, watch } from 'vue'
import type { CompanyItem, PersonItem } from '@/entity/entity'
import type { PaginatedResponse } from '@/entity/structure'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import ApiGenericService from '@/services/api.generic.service'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'

export type UseSaplingFilterWorkOptions = {
  onSelectedPeoplesChange?: (values: number[]) => void
  onSelectedCompaniesChange?: (values: number[]) => void
}

export function useSaplingFilterWork(options: UseSaplingFilterWorkOptions = {}) {
  //#region State
  let companySelectionSyncId = 0
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'navigation')
  const currentPersonStore = useCurrentPersonStore()
  const isBootstrapping = ref(true)
  const ownPerson = ref<PersonItem | null>(null)
  const peoples = ref<PaginatedResponse<PersonItem>>()
  const companies = ref<PaginatedResponse<CompanyItem>>()
  const companyPeoples = ref<PaginatedResponse<PersonItem>>()
  const selectedPeoples = ref<number[]>([])
  const selectedCompanies = ref<number[]>([])
  const peopleSearch = ref('')
  const companiesSearch = ref('')
  const expandedPanels = ref<number[]>([0, 1])
  const drawerOpen = ref(false)
  const peopleMap = ref<Record<number, PersonItem>>({})
  const isLoading = computed(() => isTranslationLoading.value || isBootstrapping.value)
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    try {
      await initializeFilter()
    } finally {
      isBootstrapping.value = false
    }
  })

  watch(selectedPeoples, (values) => {
    options.onSelectedPeoplesChange?.([...values])
  })

  watch(selectedCompanies, (values) => {
    options.onSelectedCompaniesChange?.([...values])
  })
  //#endregion

  //#region State Helpers
  /**
   * Checks whether a person is currently selected in the filter drawer.
   */
  function isPersonSelected(id: number): boolean {
    return selectedPeoples.value.includes(id)
  }

  /**
   * Resolves the stable handle of a person item for rendering and selection.
   */
  function getPersonId(person: PersonItem): number {
    return person.handle ?? 0
  }

  /**
   * Builds the display label used for a person entry.
   */
  function getPersonName(person: PersonItem): string {
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim()
    return fullName || person.email || '-'
  }

  /**
   * Checks whether a company is currently selected in the filter drawer.
   */
  function isCompanySelected(id: number): boolean {
    return selectedCompanies.value.includes(id)
  }

  /**
   * Tracks loaded people in a lookup map so downstream consumers can resolve ids cheaply.
   */
  function registerPeople(items: PersonItem[]) {
    for (const person of items) {
      if (typeof person?.handle === 'number') {
        peopleMap.value[person.handle] = person
      }
    }
  }

  /**
   * Resolves the company handle independent of how the relation is loaded.
   */
  function getCompanyHandle(person: PersonItem | null): number | null {
    if (!person?.company) {
      return null
    }

    if (typeof person.company === 'number') {
      return person.company
    }

    if (
      typeof person.company === 'object' &&
      person.company !== null &&
      'handle' in person.company
    ) {
      return person.company.handle ?? null
    }

    return null
  }

  /**
   * Applies a checkbox value or toggles the selection when no explicit state is provided.
   */
  function updateSelection(values: number[], id: number, checked?: boolean | null): number[] {
    const hasValue = values.includes(id)

    if (checked === true) {
      return hasValue ? values : [...values, id]
    }

    if (checked === false) {
      return hasValue ? values.filter((value) => value !== id) : values
    }

    return hasValue ? values.filter((value) => value !== id) : [...values, id]
  }
  //#endregion

  //#region Data Loading
  /**
   * Loads the initial payload required by the work filter drawer.
   */
  async function initializeFilter() {
    await setOwnPerson()
    await Promise.all([loadPeople(), loadCompanies(), loadCompanyPeople()])
  }

  /**
   * Loads the current user and initializes the default person selection.
   */
  async function setOwnPerson() {
    await currentPersonStore.fetchCurrentPerson()
    ownPerson.value = currentPersonStore.person
    selectedPeoples.value = ownPerson.value?.handle != null ? [ownPerson.value.handle] : []
  }

  /**
   * Loads the paginated global people list for the person section.
   */
  async function loadPeople(search = peopleSearch.value, page = 1) {
    const normalizedSearch = search.trim()
    const filter = normalizedSearch
      ? {
          $or: [
            { firstName: { $ilike: `%${normalizedSearch}%` } },
            { lastName: { $ilike: `%${normalizedSearch}%` } },
            { email: { $ilike: `%${normalizedSearch}%` } },
          ],
        }
      : {}

    peoples.value = await ApiGenericService.find<PersonItem>('person', {
      filter,
      page,
      limit: DEFAULT_PAGE_SIZE_SMALL,
    })

    registerPeople(peoples.value.data)
  }

  /**
   * Loads the colleagues of the current user's company for the employee section.
   */
  async function loadCompanyPeople(person: PersonItem | null = ownPerson.value) {
    const companyHandle = getCompanyHandle(person)
    if (companyHandle == null) {
      companyPeoples.value = undefined
      return
    }

    companyPeoples.value = await ApiGenericService.find<PersonItem>('person', {
      filter: { company: companyHandle },
      limit: DEFAULT_PAGE_SIZE_SMALL,
    })

    registerPeople(companyPeoples.value.data)
  }

  /**
   * Refreshes the selected people based on the currently selected companies.
   */
  async function syncSelectedPeopleByCompanies() {
    const companyHandles = [...selectedCompanies.value]
    const syncId = ++companySelectionSyncId

    if (companyHandles.length === 0) {
      selectedPeoples.value = []
      return
    }

    const people = await loadPeopleForSelectedCompanies(companyHandles)
    if (syncId !== companySelectionSyncId) {
      return
    }

    selectedPeoples.value = Array.from(
      new Set(
        people.map((person) => person.handle).filter((handle): handle is number => handle != null),
      ),
    )

    registerPeople(people)
  }

  /**
   * Loads all people belonging to the currently selected companies across every backend page.
   */
  async function loadPeopleForSelectedCompanies(companyHandles: number[]): Promise<PersonItem[]> {
    const normalizedCompanyHandles = Array.from(new Set(companyHandles))
    const people: PersonItem[] = []
    let page = 1
    let totalPages = 1

    do {
      const response = await ApiGenericService.find<PersonItem>('person', {
        filter: { company: { $in: normalizedCompanyHandles } },
        page,
        limit: DEFAULT_PAGE_SIZE_SMALL,
      })

      people.push(...response.data)
      totalPages = Math.max(response.meta.totalPages || 1, 1)
      page += 1
    } while (page <= totalPages)

    return people
  }

  /**
   * Loads the paginated company list for the company section.
   */
  async function loadCompanies(search = companiesSearch.value, page = 1) {
    const normalizedSearch = search.trim()
    const filter = normalizedSearch ? { name: { $ilike: `%${normalizedSearch}%` } } : {}

    companies.value = await ApiGenericService.find<CompanyItem>('company', {
      filter,
      page,
      limit: DEFAULT_PAGE_SIZE_SMALL,
    })
  }
  //#endregion

  //#region UI Actions
  /**
   * Updates the selected people when a person row or checkbox is toggled.
   */
  function togglePerson(handle: number, checked?: boolean | null) {
    selectedPeoples.value = updateSelection(selectedPeoples.value, handle, checked)
  }

  /**
   * Updates the selected companies and synchronizes the derived people selection.
   */
  function toggleCompany(handle: number, checked?: boolean | null) {
    selectedCompanies.value = updateSelection(selectedCompanies.value, handle, checked)
    void syncSelectedPeopleByCompanies()
  }

  /**
   * Applies a new people search term and restarts the people pagination.
   */
  function onPeopleSearch(value: string) {
    peopleSearch.value = value
    if (peoples.value) {
      peoples.value.meta.page = 1
    }

    void loadPeople(value, 1)
  }

  /**
   * Applies a new company search term and restarts the company pagination.
   */
  function onCompaniesSearch(value: string) {
    companiesSearch.value = value
    if (companies.value) {
      companies.value.meta.page = 1
    }

    void loadCompanies(value, 1)
  }

  /**
   * Loads a different page in the people list.
   */
  function onPeoplePage(page: number) {
    if (peoples.value) {
      peoples.value.meta.page = page
    }

    void loadPeople(peopleSearch.value, page)
  }

  /**
   * Loads a different page in the company list.
   */
  function onCompaniesPage(page: number) {
    if (companies.value) {
      companies.value.meta.page = page
    }

    void loadCompanies(companiesSearch.value, page)
  }
  //#endregion

  //#region Return
  return {
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
    selectedPeoples,
    selectedCompanies,
    peopleSearch,
    companiesSearch,
    expandedPanels,
    drawerOpen,
    peopleMap,
  }
  //#endregion
}
