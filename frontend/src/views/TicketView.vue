<template>
  <v-container class="fill-height">
    <!-- Header -->
    <sapling-header />
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';

export default defineComponent({
  name: 'TicketView',
  components: {
    SaplingHeader,
    SaplingFooter
  }
});
</script>