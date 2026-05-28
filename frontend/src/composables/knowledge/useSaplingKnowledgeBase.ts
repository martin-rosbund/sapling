import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type {
  KnowledgeArticleCategoryItem,
  KnowledgeArticleItem,
  KnowledgeArticleStatusItem,
  KnowledgeArticleVisibilityItem,
  PersonItem,
  ProductItem,
  SaplingGenericItem,
} from '@/entity/entity'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'

type RelationObject =
  | KnowledgeArticleCategoryItem
  | KnowledgeArticleStatusItem
  | KnowledgeArticleVisibilityItem
  | PersonItem
  | ProductItem

type RelationValue = RelationObject | string | number | null | undefined
type PersonRelationValue = PersonItem | string | number | null | undefined
type FilterOptionValue = string | number
type TranslateFunction = (key: string) => string

interface UseSaplingKnowledgeBaseOptions {
  t: TranslateFunction
  locale: Ref<string>
}

const KNOWLEDGE_ARTICLE_PAGE_LIMIT = 10
const RELATION_SEARCH_PAGE_LIMIT = 25
const KNOWLEDGE_ARTICLE_LOAD_DEBOUNCE_MS = 250
const ARTICLE_RELATIONS = ['status', 'visibility', 'category', 'product', 'authorPerson']
const ARTICLE_SEARCH_FIELDS = [
  'title',
  'summary',
  'tags',
  'problemMarkdown',
  'solutionMarkdown',
]

export function useSaplingKnowledgeBase({ t, locale }: UseSaplingKnowledgeBaseOptions) {
  const articles = ref<KnowledgeArticleItem[]>([])
  const isLoading = ref(true)
  const isInitialLoading = ref(true)
  const loadError = ref(false)
  const hasLoadedOnce = ref(false)
  const search = ref<string | null>('')
  const selectedProducts = ref<SaplingGenericItem[]>([])
  const selectedCategories = ref<SaplingGenericItem[]>([])
  const selectedVisibilities = ref<SaplingGenericItem[]>([])
  const selectedAuthors = ref<SaplingGenericItem[]>([])
  const selectedHandle = ref<string | null>(null)
  const page = ref(1)
  const totalArticles = ref(0)

  let activeLoadController: AbortController | null = null
  let scheduledLoadTimeout: ReturnType<typeof setTimeout> | null = null
  let latestLoadRequestId = 0

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalArticles.value / KNOWLEDGE_ARTICLE_PAGE_LIMIT)),
  )

  const selectedArticle = computed(
    () =>
      articles.value.find((article) => getArticleHandle(article) === selectedHandle.value) ??
      articles.value[0] ??
      null,
  )

  const activeLoadArticles = computed(() => (isLoading.value ? [] : articles.value))
  const isInitialLoadError = computed(() => loadError.value && !hasLoadedOnce.value)

  const filterSignature = computed(() =>
    JSON.stringify({
      search: search.value?.trim() ?? '',
      products: getSelectedHandles(selectedProducts.value),
      categories: getSelectedHandles(selectedCategories.value),
      visibilities: getSelectedHandles(selectedVisibilities.value),
      authors: getSelectedHandles(selectedAuthors.value),
    }),
  )

  onMounted(() => {
    void loadArticles()
  })

  onBeforeUnmount(() => {
    cancelScheduledLoad()
    activeLoadController?.abort()
    activeLoadController = null
  })

  watch(
    articles,
    (nextArticles) => {
      const currentHandle = selectedHandle.value
      if (
        currentHandle &&
        nextArticles.some((article) => getArticleHandle(article) === currentHandle)
      ) {
        return
      }

      selectedHandle.value = nextArticles[0] ? getArticleHandle(nextArticles[0]) : null
    },
    { immediate: true },
  )

  watch(filterSignature, () => {
    page.value = 1
    scheduleLoadArticles()
  })

  watch(page, () => {
    scheduleLoadArticles()
  })

  function onPageUpdate(value: number): void {
    page.value = value
  }

  async function loadArticles(): Promise<void> {
    activeLoadController?.abort()
    const loadController = new AbortController()
    activeLoadController = loadController
    const requestId = ++latestLoadRequestId

    isLoading.value = true
    loadError.value = false

    try {
      const response = await ApiGenericService.find<KnowledgeArticleItem>('knowledgeArticle', {
        filter: await buildArticleFilter(loadController.signal),
        orderBy: { updatedAt: 'DESC' },
        page: page.value,
        limit: KNOWLEDGE_ARTICLE_PAGE_LIMIT,
        relations: ARTICLE_RELATIONS,
        signal: loadController.signal,
      })

      if (requestId !== latestLoadRequestId) {
        return
      }

      articles.value = response.data
      totalArticles.value = response.meta.total
      hasLoadedOnce.value = true
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      if (!hasLoadedOnce.value) {
        articles.value = []
        totalArticles.value = 0
      }
      loadError.value = true
    } finally {
      if (activeLoadController === loadController) {
        activeLoadController = null
      }

      if (requestId === latestLoadRequestId) {
        isLoading.value = false
        isInitialLoading.value = false
      }
    }
  }

  function scheduleLoadArticles(): void {
    cancelScheduledLoad()
    scheduledLoadTimeout = setTimeout(() => {
      scheduledLoadTimeout = null
      void loadArticles()
    }, KNOWLEDGE_ARTICLE_LOAD_DEBOUNCE_MS)
  }

  function cancelScheduledLoad(): void {
    if (!scheduledLoadTimeout) {
      return
    }

    clearTimeout(scheduledLoadTimeout)
    scheduledLoadTimeout = null
  }

  function selectArticle(article: KnowledgeArticleItem): void {
    selectedHandle.value = getArticleHandle(article)
  }

  async function buildArticleFilter(signal: AbortSignal): Promise<FilterQuery> {
    const clauses: FilterQuery[] = [{ isActive: true }, { status: { isPublished: true } }]
    const searchValue = search.value?.trim()

    addRelationFilter(clauses, 'product', selectedProducts.value)
    addRelationFilter(clauses, 'category', selectedCategories.value)
    addRelationFilter(clauses, 'visibility', selectedVisibilities.value)
    addRelationFilter(clauses, 'authorPerson', selectedAuthors.value)

    if (searchValue) {
      const relationSearchClauses = await buildRelationSearchClauses(searchValue, signal)
      clauses.push({
        $or: [
          ...ARTICLE_SEARCH_FIELDS.map((field) => ({
            [field]: { $ilike: `%${searchValue}%` },
          })),
          ...relationSearchClauses,
        ],
      })
    }

    return clauses.length === 1 ? clauses[0] : { $and: clauses }
  }

  async function buildRelationSearchClauses(
    searchValue: string,
    signal: AbortSignal,
  ): Promise<FilterQuery[]> {
    const [categories, products, visibilities, authors] = await Promise.allSettled([
      ApiGenericService.find<KnowledgeArticleCategoryItem>('knowledgeArticleCategory', {
        filter: buildReferenceSearchFilter(['title', 'description'], searchValue, {
          isActive: true,
        }),
        limit: RELATION_SEARCH_PAGE_LIMIT,
        signal,
      }),
      ApiGenericService.find<ProductItem>('product', {
        filter: buildReferenceSearchFilter(['title', 'name', 'description'], searchValue),
        limit: RELATION_SEARCH_PAGE_LIMIT,
        signal,
      }),
      ApiGenericService.find<KnowledgeArticleVisibilityItem>('knowledgeArticleVisibility', {
        filter: buildReferenceSearchFilter(['description'], searchValue),
        limit: RELATION_SEARCH_PAGE_LIMIT,
        signal,
      }),
      ApiGenericService.find<PersonItem>('person', {
        filter: buildReferenceSearchFilter(
          ['firstName', 'lastName', 'email', 'loginName'],
          searchValue,
          { isActive: true },
        ),
        limit: RELATION_SEARCH_PAGE_LIMIT,
        signal,
      }),
    ])

    if (signal.aborted) {
      return []
    }

    return [
      buildRelationSearchClause('category', getSettledData(categories)),
      buildRelationSearchClause('product', getSettledData(products)),
      buildRelationSearchClause('visibility', getSettledData(visibilities)),
      buildRelationSearchClause('authorPerson', getSettledData(authors)),
    ].filter((clause): clause is FilterQuery => clause !== null)
  }

  function buildReferenceSearchFilter(
    fields: string[],
    searchValue: string,
    baseFilter?: FilterQuery,
  ): FilterQuery {
    const searchFilter: FilterQuery = {
      $or: fields.map((field) => ({
        [field]: { $ilike: `%${searchValue}%` },
      })),
    }

    return baseFilter ? { $and: [baseFilter, searchFilter] } : searchFilter
  }

  function buildRelationSearchClause(
    relationName: string,
    values: RelationValue[],
  ): FilterQuery | null {
    const handles = values
      .map((value) => getRelationHandleValue(value))
      .filter((value): value is FilterOptionValue => value !== null)

    if (handles.length === 0) {
      return null
    }

    return {
      [relationName]: {
        handle: handles.length === 1 ? handles[0] : { $in: handles },
      },
    }
  }

  function getSettledData<T extends RelationObject>(
    result: PromiseSettledResult<{ data: T[] }>,
  ): T[] {
    return result.status === 'fulfilled' ? result.value.data : []
  }

  function addRelationFilter(
    clauses: FilterQuery[],
    relationName: string,
    values: SaplingGenericItem[],
  ): void {
    const handles = getSelectedHandles(values)
    if (handles.length === 0) {
      return
    }

    clauses.push({
      [relationName]: {
        handle: handles.length === 1 ? handles[0] : { $in: handles },
      },
    })
  }

  function getArticleHandle(article: KnowledgeArticleItem): string {
    return article.handle == null ? article.title : String(article.handle)
  }

  function getArticlePreview(article: KnowledgeArticleItem): string {
    const source =
      article.summary ||
      stripMarkdown(article.problemMarkdown) ||
      stripMarkdown(article.solutionMarkdown) ||
      t('knowledgeBase.noPreview')

    return truncateText(source, 180)
  }

  function getArticleTags(article: KnowledgeArticleItem): string[] {
    return (article.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  function getAuthorLabel(article: KnowledgeArticleItem): string {
    return getPersonLabel(article.authorPerson)
  }

  function getPersonLabel(author: PersonRelationValue): string {
    if (typeof author === 'object' && author !== null) {
      const fullName = [author.firstName, author.lastName]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .join(' ')
        .trim()

      return (
        fullName ||
        author.email ||
        author.loginName ||
        (author.handle == null ? t('knowledgeBase.unknownAuthor') : `#${author.handle}`)
      )
    }

    if (author != null) {
      return `#${author}`
    }

    return t('knowledgeBase.unknownAuthor')
  }

  function resolveRelationLabel(value: RelationValue): string {
    if (isRelationObject(value)) {
      return (
        getTextValue(value.title) ||
        getTextValue(value.name) ||
        getTextValue(value.description) ||
        (value.handle == null ? '' : String(value.handle)) ||
        t('global.notAvailable')
      )
    }

    if (value != null && value !== '') {
      return String(value)
    }

    return t('global.notAvailable')
  }

  function resolveRelationColor(value: RelationValue): string | undefined {
    const color = isRelationObject(value) ? getTextValue(value.color) : ''
    return color || undefined
  }

  function resolveRelationIcon(value: RelationValue, fallbackIcon: string): string {
    const icon = isRelationObject(value) ? getTextValue(value.icon) : ''
    return icon || fallbackIcon
  }

  function getRelationHandle(value: RelationValue): string {
    const handle = getRelationHandleValue(value)
    return handle == null ? '' : String(handle)
  }

  function getRelationHandleValue(value: RelationValue): FilterOptionValue | null {
    if (isRelationObject(value)) {
      return value.handle == null ? null : value.handle
    }

    if (value != null && value !== '') {
      return value
    }

    return null
  }

  function hasRelationValue(value: RelationValue): boolean {
    return getRelationHandle(value) !== ''
  }

  function getSelectedHandles(values: SaplingGenericItem[]): FilterOptionValue[] {
    return values
      .map((value) => getRelationHandleValue(value as RelationValue))
      .filter((value): value is FilterOptionValue => value !== null && value !== '')
  }

  function isRelationObject(value: RelationValue): value is RelationObject {
    return typeof value === 'object' && value !== null
  }

  function getTextValue(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : ''
  }

  function stripMarkdown(value?: string | null): string {
    return (value ?? '')
      .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
      .replace(/[#>*_[\]()~-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function truncateText(value: string, maxLength: number): string {
    const normalizedValue = value.replace(/\s+/g, ' ').trim()
    if (normalizedValue.length <= maxLength) {
      return normalizedValue
    }

    return `${normalizedValue.slice(0, maxLength).trim()}...`
  }

  function formatDate(value?: Date | string | null): string {
    if (!value) {
      return t('global.notAvailable')
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return t('global.notAvailable')
    }

    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(date)
  }

  return {
    activeLoadArticles,
    formatDate,
    getArticleHandle,
    getArticlePreview,
    getArticleTags,
    getAuthorLabel,
    hasRelationValue,
    isInitialLoadError,
    isInitialLoading,
    isLoading,
    onPageUpdate,
    page,
    resolveRelationColor,
    resolveRelationIcon,
    resolveRelationLabel,
    search,
    selectArticle,
    selectedAuthors,
    selectedArticle,
    selectedCategories,
    selectedHandle,
    selectedProducts,
    selectedVisibilities,
    totalArticles,
    totalPages,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ERR_CANCELED'
  )
}
