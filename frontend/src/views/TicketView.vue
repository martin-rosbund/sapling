<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-ticket/>

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts" setup>
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingTicket from '@/components/ticket/SaplingTicket.vue';
</script>