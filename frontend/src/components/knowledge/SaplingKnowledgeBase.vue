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

    <v-alert
      v-else-if="isInitialLoadError"
      color="error"
      variant="tonal"
      icon="mdi-alert-circle-outline"
    >
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

            <v-btn
              class="sapling-knowledge-sidebar__filter-toggle"
              :append-icon="isFilterPanelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              :aria-label="t('filter.filter')"
              :aria-expanded="isFilterPanelOpen"
              :title="t('filter.filter')"
              aria-controls="sapling-knowledge-filter-grid"
              color="primary"
              prepend-icon="mdi-filter-variant"
              variant="tonal"
              @click="isFilterPanelOpen = !isFilterPanelOpen"
            >
              {{ t('filter.filter') }}
            </v-btn>
          </div>

          <div
            id="sapling-knowledge-filter-grid"
            class="sapling-knowledge-sidebar__filter-grid"
            :class="{
              'sapling-knowledge-sidebar__filter-grid--open': isFilterPanelOpen,
            }"
          >
            <SaplingFieldSelect
              v-model="selectedProducts"
              entity-handle="product"
              :label="t('knowledgeArticle.product')"
              density="compact"
              hide-details
            />

            <SaplingFieldSelect
              v-model="selectedCategories"
              entity-handle="knowledgeArticleCategory"
              :label="t('knowledgeArticle.category')"
              :parent-filter="activeReferenceFilter"
              density="compact"
              hide-details
            />

            <SaplingFieldSelect
              v-model="selectedVisibilities"
              entity-handle="knowledgeArticleVisibility"
              :label="t('knowledgeArticle.visibility')"
              density="compact"
              hide-details
            />

            <SaplingFieldSelect
              v-model="selectedAuthors"
              entity-handle="person"
              :label="t('knowledgeArticle.authorPerson')"
              :parent-filter="activeReferenceFilter"
              density="compact"
              hide-details
            />
          </div>
        </div>

        <header class="sapling-section-header sapling-knowledge-sidebar__header">
          <div>
            <p class="sapling-eyebrow">{{ t('navigation.knowledgeBase') }}</p>
            <h2>{{ t('knowledgeBase.filteredCount', { count: totalArticles }) }}</h2>
          </div>
        </header>

        <div v-if="isLoading" class="sapling-knowledge-sidebar__article-list">
          <v-skeleton-loader
            v-for="skeletonIndex in 4"
            :key="`knowledge-article-skeleton-${skeletonIndex}`"
            type="list-item-three-line"
          />
        </div>

        <div
          v-else-if="activeLoadArticles.length === 0"
          class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-knowledge-sidebar__empty"
        >
          <v-icon icon="mdi-book-search-outline" size="32" />
          <h3 class="sapling-empty-state-panel__title">{{ t('knowledgeBase.emptyTitle') }}</h3>
          <p class="sapling-empty-state-panel__text">{{ t('knowledgeBase.emptyText') }}</p>
        </div>

        <div v-else class="sapling-knowledge-sidebar__article-list">
          <button
            v-for="article in activeLoadArticles"
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

        <div v-if="totalPages > 1" class="sapling-knowledge-sidebar__pagination">
          <v-pagination
            :model-value="page"
            :length="totalPages"
            :total-visible="5"
            density="comfortable"
            rounded="circle"
            @update:model-value="onPageUpdate"
          />
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingFieldSelect from '@/components/dialog/fields/SaplingFieldSelect.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { useSaplingKnowledgeBase } from '@/composables/knowledge/useSaplingKnowledgeBase'

const { t, locale } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader(
  'global',
  'navigation',
  'filter',
  'knowledgeArticle',
  'knowledgeBase',
)

const isFilterPanelOpen = ref(false)
const activeReferenceFilter = { isActive: true }
const emptyMarkdown = computed(() => t('global.notAvailable'))
const {
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
} = useSaplingKnowledgeBase({ t, locale })

const isPageLoading = computed(() => isInitialLoading.value || isTranslationLoading.value)
</script>
