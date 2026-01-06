<template>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-bug />

    <!-- Footer -->
    <sapling-footer />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  //#endregion

  //#region Components
  import SaplingFooter from '@/components/system/SaplingFooter.vue';
  import SaplingHeader from '@/components/system/SaplingHeader.vue';
  import SaplingBug from '@/components/system/SaplingBug.vue';

  export default defineComponent({
    name: 'BugView',
    components: {
      SaplingHeader,
      SaplingBug,
      SaplingFooter
    }
  });
  //#endregion
</script>