<template>
  <v-container class="fill-height">
    <!-- Content -->
    <sapling-login />
    
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingLogin from '@/components/SaplingLogin.vue';

export default defineComponent({
  name: 'LoginView',
  components: {
    SaplingLogin,
    SaplingFooter
  }
});
</script>