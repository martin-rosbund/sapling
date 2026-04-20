<template>
  <div class="sapling-app-layout sapling-public-layout">
    <div class="sapling-app-layout__content sapling-content sapling-content--public">
      <RouterView />
    </div>

    <div class="sapling-app-layout__footer">
      <SaplingFooterLogin />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { RouterView } from 'vue-router'
import SaplingFooterLogin from '@/components/system/SaplingFooterLogin.vue'
</script>
