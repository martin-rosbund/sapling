<template>
  <section v-if="showSection" class="sapling-card-strip sapling-dashboard__favorites glass-panel">
    <div v-if="isLoading" class="sapling-card-strip__track">
      <article v-for="item in 4" :key="item" class="sapling-list-card sapling-list-card--loading">
        <v-skeleton-loader type="list-item" />
      </article>
    </div>

    <div v-else class="sapling-card-strip__track">
      <v-btn
        v-for="template in recommendedFavoriteTemplates"
        :key="template.handle ?? template.name"
        class="sapling-dashboard-favorite-button sapling-panel-shell-muted"
        block
        :prepend-icon="getTemplateIcon(template)"
        variant="flat"
        :aria-label="`${t('favorite.templateLoadAction')}: ${template.name}`"
        :title="`${t('favorite.templateLoadAction')}: ${template.name}`"
        @click="goToFavoriteTemplate(template)"
      >
        <span class="sapling-dashboard-favorite-button__label">{{ template.name }}</span>
      </v-btn>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites'
import type { FavoriteTemplateItem } from '@/entity/entity'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { isLoading, hasFavoriteTemplateAccess, favoriteTemplates, goToFavoriteTemplate } =
  useSaplingFavorites()

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
