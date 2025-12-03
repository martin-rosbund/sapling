<template>
  <!-- Header -->
  <sapling-header />

    <!-- Content -->
  <sapling-error />
  
    <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingHeader from '@/components/SaplingHeader.vue';
  import SaplingFooter from '@/components/SaplingFooter.vue';
  import SaplingError from '@/components/SaplingError.vue';
  //#endregion

  //#region Components
  export default defineComponent({
    name: 'ErrorView',
    components: {
      SaplingHeader, 
      SaplingFooter,
      SaplingError
    },
  });
  //#endregion
</script>