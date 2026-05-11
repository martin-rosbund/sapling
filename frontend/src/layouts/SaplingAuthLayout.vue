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
      <SaplingMessageCenter />
      <SaplingDialogMail />
      <SaplingDialogPhoneCall />
      <SaplingRecordTimeline />
      <SaplingCommandPalette />
    </template>

    <div v-else class="sapling-app-layout__loading">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingHeader from '@/components/system/SaplingHeader.vue'
import SaplingNavigation from '@/components/system/SaplingNavigation.vue'

// Heavy or rarely used shell widgets: load them only when actually mounted/opened.
const SaplingAiChat = defineAsyncComponent(
  () => import('@/components/system/SaplingAiChat.vue'),
)
const SaplingMessageCenter = defineAsyncComponent(
  () => import('@/components/system/SaplingMessageCenter.vue'),
)
const SaplingVectorizationDialog = defineAsyncComponent(
  () => import('@/components/system/SaplingVectorizationDialog.vue'),
)
const SaplingDialogMail = defineAsyncComponent(
  () => import('@/components/dialog/SaplingDialogMail.vue'),
)
const SaplingDialogPhoneCall = defineAsyncComponent(
  () => import('@/components/dialog/SaplingDialogPhoneCall.vue'),
)
const SaplingRecordTimeline = defineAsyncComponent(
  () => import('@/components/timeline/SaplingRecordTimeline.vue'),
)
const SaplingCommandPalette = defineAsyncComponent(
  () => import('@/components/system/SaplingCommandPalette.vue'),
)

const navigationDrawer = ref(false)
const { isLoading: isShellTranslationLoading } = useTranslationLoader('global', 'login')
</script>
