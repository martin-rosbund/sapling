<template>
  <div class="sapling-app-layout sapling-auth-layout">
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

    <div class="sapling-app-layout__footer">
      <SaplingFooter />
    </div>

    <SaplingAiChat />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import SaplingFooter from '@/components/system/SaplingFooter.vue'
import SaplingAiChat from '@/components/system/SaplingAiChat.vue'
import SaplingHeader from '@/components/system/SaplingHeader.vue'
import SaplingNavigation from '@/components/system/SaplingNavigation.vue'

const navigationDrawer = ref(false)
</script>
