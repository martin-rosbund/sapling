<template>
  <div class="sapling-search">
    <div v-if="isTranslationLoading" class="sapling-search__loading">
      <v-icon size="small">{{ entity?.icon || 'mdi-magnify' }}</v-icon>
      <v-skeleton-loader class="sapling-search__loading-text" type="text" />
    </div>
    <v-text-field
      v-else
      :model-value="localSearch"
      :label="searchLabel"
      :prepend-inner-icon="entity?.icon || 'mdi-magnify'"
      hide-details
      single-line
      variant="solo"
      clearable
      @update:model-value="onSearchUpdate"
    />
  </div>
</template>

<script lang="ts" setup>
//#region Imports
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { useSaplingSearch } from '@/composables/system/useSaplingSearch'
import type { EntityItem } from '@/entity/entity'

// Props and Emits
interface SaplingSearchProps {
  modelValue: string
  entity: EntityItem | null
}

const props = defineProps<SaplingSearchProps>()
const emit = defineEmits<{
  (event: 'update:model-value', value: string): void
}>()
//#endregion

//#region Composable
const { t } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'navigation')
const { localSearch, onSearchUpdate } = useSaplingSearch(toRef(props, 'modelValue'), emit)
const searchLabel = computed(() =>
  props.entity ? t(`navigation.${props.entity.handle}`) : t('global.search'),
)
//#endregion
</script>
