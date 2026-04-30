<template>
  <div class="sapling-app-layout sapling-auth-layout">
    <template v-if="!isShellTranslationLoading">
      <div class="sapling-app-layout__header">
        <SaplingHeader v-model="navigationDrawer" />
      </div>

      <div class="sapling-auth-layout__body">
        <SaplingNavigation v-model="navigationDrawer" />

        <div
          class="sapling-app-layout__content sapling-content sapling-content--app sapling-auth-layout__content"
        >
          <RouterView />
        </div>
      </div>

      <SaplingAiChat />
      <SaplingVectorizationDialog />
    </template>

    <div v-else class="sapling-app-layout__loading">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingAiChat from '@/components/system/SaplingAiChat.vue'
import SaplingVectorizationDialog from '@/components/system/SaplingVectorizationDialog.vue'
import SaplingHeader from '@/components/system/SaplingHeader.vue'
import SaplingNavigation from '@/components/system/SaplingNavigation.vue'

const navigationDrawer = ref(false)
const { isLoading: isShellTranslationLoading } = useTranslationLoader('global', 'login')
</script>
