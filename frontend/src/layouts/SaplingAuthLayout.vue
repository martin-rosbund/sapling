<template>
  <div class="sapling-app-layout sapling-auth-layout">
    <div class="sapling-app-layout__header">
      <SaplingHeader />
    </div>

    <div class="sapling-app-layout__content sapling-content sapling-content--app">
      <RouterView />
    </div>

    <div class="sapling-app-layout__footer">
      <SaplingFooter />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { RouterView } from 'vue-router';
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
</script>