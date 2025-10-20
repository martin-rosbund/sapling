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

<style>
.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #343a40;
  font-family: Arial, sans-serif;
}

.error-page h1 {
  font-size: 6rem;
  margin: 0;
}

.error-page p {
  font-size: 1.5rem;
  margin: 1rem 0;
}

.error-page a {
  color: #007bff;
  text-decoration: none;
  font-size: 1.2rem;
}

.error-page a:hover {
  text-decoration: underline;
}
</style>
