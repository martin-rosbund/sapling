<template>
  <v-container class="fill-height">
    <sapling-login />
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingLogin from '@/components/SaplingLogin.vue';

export default defineComponent({
    components: {
    SaplingLogin,
    SaplingFooter
  }
});
</script>