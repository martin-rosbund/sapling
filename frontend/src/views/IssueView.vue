<template>
  <SaplingIssue />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  //#endregion

  //#region Components
  import SaplingIssue from '@/components/system/SaplingIssue.vue';

  export default defineComponent({
    name: 'IssueView',
    components: {
      SaplingIssue,
    }
  });
  //#endregion
</script>