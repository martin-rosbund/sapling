<template>
  <section
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--scroll sapling-page-shell--uniform-inset sapling-knowledge-page"
  >
    <div v-if="isPageLoading" class="sapling-knowledge-notebook">
      <SaplingSurface as="aside" class="sapling-knowledge-sidebar">
        <v-skeleton-loader
          type="heading, text, list-item-two-line, list-item-two-line, list-item-two-line"
        />
      </SaplingSurface>
      <SaplingSurface as="article" class="sapling-knowledge-reader">
        <v-skeleton-loader type="article, paragraph, actions" />
      </SaplingSurface>
    </div>

    <v-alert v-else-if="loadError" color="error" variant="tonal" icon="mdi-alert-circle-outline">
      {{ t('knowledgeBase.loadError') }}
    </v-alert>

    <div v-else class="sapling-knowledge-notebook">
      <SaplingSurface as="aside" class="sapling-knowledge-sidebar">
        <div class="sapling-knowledge-sidebar__controls">
          <div class="sapling-knowledge-sidebar__search-row">
            <v-text-field
              v-model="search"
              :label="t('knowledgeBase.search')"
              prepend-inner-icon="mdi-magnify"
              density="comfortable"
              variant="outlined"
              clearable
              hide-details
            />
          </div>

          <div class="sapling-knowledge-sidebar__filter-grid">
            <v-select
              v-model="selectedProduct"
              :items="productItems"
              :label="t('knowledgeArticle.product')"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
            />

            <v-select
              v-model="selectedCategory"
              :items="categoryItems"
              :label="t('knowledgeArticle.category')"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
            />

            <v-select
              v-model="selectedVisibility"
              :items="visibilityItems"
              :label="t('knowledgeArticle.visibility')"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
            />

            <v-select
              v-model="selectedAuthor"
              :items="authorItems"
              :label="t('knowledgeArticle.authorPerson')"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
            />
          </div>
        </div>

        <header class="sapling-section-header sapling-knowledge-sidebar__header">
          <div>
            <p class="sapling-eyebrow">{{ t('navigation.knowledgeBase') }}</p>
            <h2>{{ t('knowledgeBase.filteredCount', { count: filteredArticles.length }) }}</h2>
          </div>
          <v-chip color="success" size="small" variant="tonal">
            {{ publishedArticles.length }}
          </v-chip>
        </header>

        <div
          v-if="filteredArticles.length === 0"
          class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-knowledge-sidebar__empty"
        >
          <v-icon icon="mdi-book-search-outline" size="32" />
          <h3 class="sapling-empty-state-panel__title">{{ t('knowledgeBase.emptyTitle') }}</h3>
          <p class="sapling-empty-state-panel__text">{{ t('knowledgeBase.emptyText') }}</p>
        </div>

        <div v-else class="sapling-knowledge-sidebar__article-list">
          <button
            v-for="article in filteredArticles"
            :key="getArticleHandle(article)"
            class="sapling-knowledge-sidebar__article"
            :class="{
              'sapling-knowledge-sidebar__article--active':
                getArticleHandle(article) === selectedHandle,
            }"
            type="button"
            @click="selectArticle(article)"
          >
            <span class="sapling-knowledge-sidebar__article-title">
              <v-icon
                :icon="resolveRelationIcon(article.category, 'mdi-bookmark-outline')"
                size="18"
              />
              <strong>{{ article.title }}</strong>
            </span>

            <span class="sapling-knowledge-sidebar__article-meta">
              {{ formatDate(article.publishedAt ?? article.updatedAt) }} -
              {{ getAuthorLabel(article) }}
            </span>

            <span class="sapling-knowledge-sidebar__article-preview">
              {{ getArticlePreview(article) }}
            </span>

            <span class="sapling-chip-row sapling-knowledge-sidebar__badges">
              <v-chip
                v-if="hasRelationValue(article.product)"
                prepend-icon="mdi-package-variant-closed"
                size="x-small"
                variant="tonal"
              >
                {{ resolveRelationLabel(article.product) }}
              </v-chip>
              <v-chip
                :color="resolveRelationColor(article.category)"
                :prepend-icon="resolveRelationIcon(article.category, 'mdi-bookmark-outline')"
                size="x-small"
                variant="tonal"
              >
                {{ resolveRelationLabel(article.category) }}
              </v-chip>
              <v-chip
                :color="resolveRelationColor(article.visibility)"
                :prepend-icon="resolveRelationIcon(article.visibility, 'mdi-eye-outline')"
                size="x-small"
                variant="tonal"
              >
                {{ resolveRelationLabel(article.visibility) }}
              </v-chip>
            </span>
          </button>
        </div>
      </SaplingSurface>

      <SaplingSurface v-if="selectedArticle" as="article" class="sapling-knowledge-reader">
        <div class="sapling-knowledge-reader__scroll">
          <header class="sapling-knowledge-reader__header">
            <p class="sapling-eyebrow">
              {{ resolveRelationLabel(selectedArticle.category) }}
            </p>
            <h1>{{ selectedArticle.title }}</h1>

            <div class="sapling-chip-row sapling-knowledge-reader__meta">
              <v-chip
                :color="resolveRelationColor(selectedArticle.visibility)"
                :prepend-icon="resolveRelationIcon(selectedArticle.visibility, 'mdi-eye-outline')"
                size="small"
                variant="tonal"
              >
                {{ resolveRelationLabel(selectedArticle.visibility) }}
              </v-chip>
              <v-chip prepend-icon="mdi-account-edit-outline" size="small" variant="tonal">
                {{ getAuthorLabel(selectedArticle) }}
              </v-chip>
              <v-chip prepend-icon="mdi-calendar-check-outline" size="small" variant="tonal">
                {{ formatDate(selectedArticle.publishedAt ?? selectedArticle.updatedAt) }}
              </v-chip>
              <v-chip
                v-if="hasRelationValue(selectedArticle.product)"
                prepend-icon="mdi-package-variant-closed"
                size="small"
                variant="tonal"
              >
                {{ resolveRelationLabel(selectedArticle.product) }}
              </v-chip>
            </div>
          </header>

          <p v-if="selectedArticle.summary" class="sapling-knowledge-reader__summary">
            {{ selectedArticle.summary }}
          </p>

          <div
            v-if="getArticleTags(selectedArticle).length > 0"
            class="sapling-chip-row sapling-knowledge-reader__tags"
          >
            <v-chip
              v-for="tag in getArticleTags(selectedArticle)"
              :key="tag"
              size="x-small"
              variant="outlined"
            >
              {{ tag }}
            </v-chip>
          </div>

          <section class="sapling-knowledge-reader__section sapling-knowledge-reader__section--focus glass-panel">
            <h3>{{ t('knowledgeArticle.problemMarkdown') }}</h3>
            <SaplingMarkdownContent :source="selectedArticle.problemMarkdown || emptyMarkdown" />
          </section>

          <section class="sapling-knowledge-reader__section sapling-knowledge-reader__section--focus glass-panel">
            <h3>{{ t('knowledgeArticle.solutionMarkdown') }}</h3>
            <SaplingMarkdownContent :source="selectedArticle.solutionMarkdown || emptyMarkdown" />
          </section>
        </div>
      </SaplingSurface>

      <SaplingSurface v-else as="article" class="sapling-knowledge-reader">
        <div class="sapling-empty-state-panel sapling-empty-state-panel--compact">
          <v-icon icon="mdi-book-open-blank-variant-outline" size="32" />
          <p class="sapling-empty-state-panel__text">{{ t('knowledgeBase.selectArticle') }}</p>
        </div>
      </SaplingSurface>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import type {
  KnowledgeArticleItem,
  KnowledgeArticleCategoryItem,
  KnowledgeArticleStatusItem,
  KnowledgeArticleVisibilityItem,
  PersonItem,
  ProductItem,
} from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'

type RelationObject =
  | KnowledgeArticleCategoryItem
  | KnowledgeArticleStatusItem
  | KnowledgeArticleVisibilityItem
  | PersonItem
  | ProductItem

type RelationValue = RelationObject | string | number | null | undefined

interface FilterOption {
  title: string
  value: string
  sortOrder: number
}

const ALL_FILTER_VALUE = '__all__'
const KNOWLEDGE_ARTICLE_PAGE_LIMIT = 100
const ARTICLE_RELATIONS = ['status', 'visibility', 'category', 'product', 'authorPerson']

const { t, locale } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader(
  'global',
  'navigation',
  'knowledgeArticle',
  'knowledgeBase',
)

const articles = ref<KnowledgeArticleItem[]>([])
const isLoading = ref(true)
const loadError = ref(false)
const search = ref<string | null>('')
const selectedProduct = ref(ALL_FILTER_VALUE)
const selectedCategory = ref(ALL_FILTER_VALUE)
const selectedVisibility = ref(ALL_FILTER_VALUE)
const selectedAuthor = ref(ALL_FILTER_VALUE)
const selectedHandle = ref<string | null>(null)

const emptyMarkdown = computed(() => t('global.notAvailable'))
const isPageLoading = computed(() => isLoading.value || isTranslationLoading.value)

const publishedArticles = computed(() =>
  articles.value.filter(
    (article) => article.isActive !== false && isPublishedStatus(article.status),
  ),
)

const normalizedSearch = computed(() => normalizeSearch(search.value))

const filteredArticles = computed(() =>
  publishedArticles.value.filter((article) => {
    return (
      matchesSearch(article) &&
      matchesFilter(article.product, selectedProduct.value) &&
      matchesFilter(article.category, selectedCategory.value) &&
      matchesFilter(article.visibility, selectedVisibility.value) &&
      matchesFilter(article.authorPerson, selectedAuthor.value)
    )
  }),
)

const selectedArticle = computed(
  () =>
    filteredArticles.value.find((article) => getArticleHandle(article) === selectedHandle.value) ??
    filteredArticles.value[0] ??
    null,
)

const categoryItems = computed(() => [
  createAllOption(t('knowledgeBase.allCategories')),
  ...buildRelationOptions(publishedArticles.value.map((article) => article.category)),
])

const productItems = computed(() => [
  createAllOption(t('knowledgeBase.allProducts')),
  ...buildRelationOptions(publishedArticles.value.map((article) => article.product)),
])

const visibilityItems = computed(() => [
  createAllOption(t('knowledgeBase.allVisibility')),
  ...buildRelationOptions(publishedArticles.value.map((article) => article.visibility)),
])

const authorItems = computed(() => [
  createAllOption(t('knowledgeBase.allAuthors')),
  ...buildAuthorOptions(publishedArticles.value),
])

onMounted(() => {
  void loadArticles()
})

watch(
  filteredArticles,
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

async function loadArticles(): Promise<void> {
  isLoading.value = true
  loadError.value = false

  try {
    const loadedArticles: KnowledgeArticleItem[] = []
    let page = 1
    let totalPages = 1

    do {
      const response = await ApiGenericService.find<KnowledgeArticleItem>('knowledgeArticle', {
        filter: { isActive: true },
        orderBy: { updatedAt: 'DESC' },
        page,
        limit: KNOWLEDGE_ARTICLE_PAGE_LIMIT,
        relations: ARTICLE_RELATIONS,
      })

      loadedArticles.push(...response.data)
      totalPages = response.meta.totalPages || 1
      page += 1
    } while (page <= totalPages)

    articles.value = loadedArticles
  } catch {
    articles.value = []
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

function selectArticle(article: KnowledgeArticleItem): void {
  selectedHandle.value = getArticleHandle(article)
}

function matchesSearch(article: KnowledgeArticleItem): boolean {
  const needle = normalizedSearch.value
  if (!needle) {
    return true
  }

  const haystack = [
    article.title,
    article.summary,
    article.tags,
    article.problemMarkdown,
    article.solutionMarkdown,
    resolveRelationLabel(article.category),
    resolveRelationLabel(article.product),
    resolveRelationLabel(article.visibility),
    getAuthorLabel(article),
  ]
    .map((value) => normalizeSearch(value ?? ''))
    .join(' ')

  return haystack.includes(needle)
}

function matchesFilter(value: RelationValue, selectedValue: string): boolean {
  return selectedValue === ALL_FILTER_VALUE || getRelationHandle(value) === selectedValue
}

function createAllOption(title: string): FilterOption {
  return { title, value: ALL_FILTER_VALUE, sortOrder: -1 }
}

function buildRelationOptions(values: RelationValue[]): FilterOption[] {
  const optionByValue = new Map<string, FilterOption>()

  values.forEach((value) => {
    const handle = getRelationHandle(value)
    if (!handle || optionByValue.has(handle)) {
      return
    }

    optionByValue.set(handle, {
      title: resolveRelationLabel(value),
      value: handle,
      sortOrder: getRelationSortOrder(value),
    })
  })

  return Array.from(optionByValue.values()).sort(sortFilterOptions)
}

function buildAuthorOptions(values: KnowledgeArticleItem[]): FilterOption[] {
  const optionByValue = new Map<string, FilterOption>()

  values.forEach((article) => {
    const handle = getRelationHandle(article.authorPerson)
    if (!handle || optionByValue.has(handle)) {
      return
    }

    optionByValue.set(handle, {
      title: getAuthorLabel(article),
      value: handle,
      sortOrder: Number.MAX_SAFE_INTEGER,
    })
  })

  return Array.from(optionByValue.values()).sort(sortFilterOptions)
}

function sortFilterOptions(left: FilterOption, right: FilterOption): number {
  return left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, locale.value)
}

function isPublishedStatus(value: RelationValue): boolean {
  if (isRelationObject(value) && value.isPublished === true) {
    return true
  }

  return getRelationHandle(value) === 'published'
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
  const author = article.authorPerson
  if (isRelationObject(author)) {
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
  if (isRelationObject(value)) {
    return value.handle == null ? '' : String(value.handle)
  }

  if (value != null && value !== '') {
    return String(value)
  }

  return ''
}

function hasRelationValue(value: RelationValue): boolean {
  return getRelationHandle(value) !== ''
}

function getRelationSortOrder(value: RelationValue): number {
  return isRelationObject(value) && typeof value.sortOrder === 'number'
    ? value.sortOrder
    : Number.MAX_SAFE_INTEGER
}

function isRelationObject(value: RelationValue): value is RelationObject {
  return typeof value === 'object' && value !== null
}

function getTextValue(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeSearch(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase(locale.value)
    .trim()
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
</script>
