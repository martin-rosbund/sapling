<template>
  <div class="sapling-app-layout sapling-public-layout">
    <template v-if="!isShellTranslationLoading">
      <div class="sapling-app-layout__content sapling-content sapling-content--public">
        <RouterView />
      </div>

      <div class="sapling-app-layout__footer">
        <SaplingFooterLogin />
      </div>
    </template>

    <div v-else class="sapling-app-layout__loading">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { RouterView } from 'vue-router'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingFooterLogin from '@/components/system/SaplingFooterLogin.vue'

const { isLoading: isShellTranslationLoading } = useTranslationLoader('global', 'login')
</script>
