<template>
  <v-app>
    <v-main>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { onMounted } from 'vue'
  import { useTheme } from 'vuetify'
  import CookieService from '@/services/cookie.service'

  const theme = useTheme()

  onMounted(() => {
    //const savedLanguage = CookieService.get('language')
    //if (!savedLanguage ) {
    //  CookieService.set('language', 'de-DE')
    //}

    const savedTheme = CookieService.get('theme')
    if (savedTheme && savedTheme !== (theme.global.current.value.dark ? 'dark' : 'light')) {
      theme.global.name.value = savedTheme
    }
  })
</script>

<script lang="ts">
  import { defineComponent } from 'vue'

  export default defineComponent({
    name: 'App',

    data () {
      return {
        //
      }
    },
  })
</script>