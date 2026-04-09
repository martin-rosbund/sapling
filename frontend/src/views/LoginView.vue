<template>
  <SaplingLogin />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingLogin from '@/components/account/SaplingLogin.vue';
  //#endregion

  //#region Components
  export default defineComponent({
    name: 'LoginView',
    components: {
      SaplingLogin,
    }
  });
  //#endregion
</script>