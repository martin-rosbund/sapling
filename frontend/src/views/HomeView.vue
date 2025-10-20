<template>
    <!-- Header -->
  <sapling-header />

    <!-- Content -->
  <sapling-dashboard />
  
    <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingDashboard from '@/components/SaplingDashboard.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingFooter from '@/components/SaplingFooter.vue';

export default defineComponent({
  name: 'HomeView',
  components: {
    SaplingDashboard, 
    SaplingHeader, 
    SaplingFooter
  },
});
</script>
