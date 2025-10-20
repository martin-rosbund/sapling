<template>
  <v-container class="fill-height">
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-account />
    
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingAccount from '@/components/SaplingAccount.vue';

export default defineComponent({
  name: 'LoginView',
  components: {
    SaplingHeader,
    SaplingAccount,
    SaplingFooter
  }
});
</script>