
<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-note />

    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';

// Composables
import SaplingNote from '@/components/note/SaplingNote.vue';

export default defineComponent({
  name: 'NoteView',
  components: { 
    SaplingHeader, 
    SaplingFooter, 
    SaplingNote 
  },
});
</script>
