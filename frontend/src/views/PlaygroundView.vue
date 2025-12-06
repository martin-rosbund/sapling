<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-playground/>

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts" setup>
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingPlayground from '@/components/developer/SaplingPlayground.vue';
</script>