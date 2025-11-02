<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-ticket />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingTicket from '@/components/ticket/SaplingTicket.vue';

export default defineComponent({
  name: 'TicketView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingTicket
  }
});
</script>