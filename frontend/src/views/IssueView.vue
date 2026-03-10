<template>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-issue />

    <!-- Footer -->
    <sapling-footer />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  //#endregion

  //#region Components
  import SaplingFooter from '@/components/system/SaplingFooter.vue';
  import SaplingHeader from '@/components/system/SaplingHeader.vue';
  import SaplingIssue from '@/components/system/SaplingIssue.vue';

  export default defineComponent({
    name: 'IssueView',
    components: {
      SaplingHeader,
      SaplingIssue,
      SaplingFooter
    }
  });
  //#endregion
</script>