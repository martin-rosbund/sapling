<template>
  <section v-if="showSection" class="sapling-card-strip glass-panel">
    <div v-if="isLoading" class="sapling-card-strip__track">
      <article v-for="item in 4" :key="item" class="sapling-list-card sapling-list-card--loading">
        <v-skeleton-loader type="list-item" />
      </article>
    </div>

    <div v-else class="sapling-card-strip__track">
      <article
        v-for="template in recommendedFavoriteTemplates"
        :key="template.handle ?? template.name"
        class="sapling-list-card sapling-panel-shell-muted"
      >
        <div class="sapling-list-card__summary">
          <div class="sapling-icon-tile sapling-icon-tile--sm sapling-icon-tile--primary-soft">
            <v-icon :icon="getTemplateIcon(template)" size="16" />
          </div>

          <h3 class="sapling-list-card__title">
            {{ template.name }}
          </h3>
        </div>

        <div class="sapling-list-card__actions">
          <v-btn
            v-if="hasFavoritesAccess"
            icon="mdi-bookmark-plus-outline"
            size="x-small"
            density="comfortable"
            variant="text"
            :disabled="loadingFavoriteTemplateHandle !== null"
            :loading="loadingFavoriteTemplateHandle === template.handle"
            :aria-label="`${t('global.add')}: ${template.name}`"
            :title="`${t('global.add')}: ${template.name}`"
            @click="loadFavoriteFromTemplate(template)"
          />

          <v-btn
            icon="mdi-arrow-top-right"
            size="x-small"
            density="comfortable"
            color="primary"
            variant="text"
            :aria-label="`${t('favorite.templateLoadAction')}: ${template.name}`"
            :title="`${t('favorite.templateLoadAction')}: ${template.name}`"
            @click="goToFavoriteTemplate(template)"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites'
import type { FavoriteTemplateItem } from '@/entity/entity'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const {
  isLoading,
  hasFavoritesAccess,
  hasFavoriteTemplateAccess,
  favoriteTemplates,
  loadingFavoriteTemplateHandle,
  loadFavoriteFromTemplate,
  goToFavoriteTemplate,
} = useSaplingFavorites()

const { t } = useI18n()

const recommendedFavoriteTemplates = computed(() =>
  favoriteTemplates.value.filter((template) => template.isRecommended),
)

const showSection = computed(() => {
  return (
    hasFavoriteTemplateAccess.value &&
    (isLoading.value || recommendedFavoriteTemplates.value.length > 0)
  )
})

function getTemplateIcon(template: FavoriteTemplateItem) {
  if (typeof template.entity === 'object' && template.entity?.icon) {
    return template.entity.icon
  }

  return 'mdi-bookmark-outline'
}
</script>
