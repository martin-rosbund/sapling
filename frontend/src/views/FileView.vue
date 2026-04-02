<template>
  <div>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <div>
      <sapling-file :entity-handle="entityHandle" />
    </div>

    <!-- Footer -->
    <sapling-footer />
  </div>
</template>

<script lang="ts" setup>
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingFile from '@/components/file/SaplingFile.vue';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const entityHandle = computed(() => route.params.entity as string);
</script>
