<template>
  <!-- Header -->
  <sapling-header />

    <!-- Content -->
  <sapling-error />
  
    <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingError from '@/components/SaplingError.vue';

export default defineComponent({
  name: 'ErrorView',
  components: {
    SaplingHeader, 
    SaplingFooter,
    SaplingError
  },
});
</script>