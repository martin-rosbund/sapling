<template>
  <v-container class="fill-height">
    <sapling-header />
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';

export default defineComponent({
  name: 'PersonView',
    components: {
    SaplingHeader,
    SaplingFooter
  }
});
</script>