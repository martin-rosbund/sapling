<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-partner :entity-name="entityName" />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts" setup>
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingPartner from '@/components/partner/SaplingPartner.vue';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const entityName = computed(() => route.params.entity as string);
</script>