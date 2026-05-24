<template>
  <!-- Error page with skeleton loader and not found message -->
  <SaplingSurface
    :as="VSkeletonLoader"
    v-if="isLoading"
    class="mx-auto fill-height"
    elevation="12"
    type="article, actions"
  />
  <template v-else>
    <v-empty-state :headline="$t('error.pageNotFoundCode')" :title="$t('error.pageNotFound')" />
  </template>
</template>

<script setup lang="ts">
// #region Imports
import { VSkeletonLoader } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import { useSaplingError } from '@/composables/system/useSaplingError'
// #endregion

// #region Composable
// The error page only needs the translation loading state.
const { isLoading } = useSaplingError()
// #endregion
</script>
