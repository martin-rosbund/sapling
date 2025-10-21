<template>
  <v-app>
    <v-main>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  // Import lifecycle hook from Vue
  import { onMounted } from 'vue'
  // Import Vuetify's theme composable
  import { useTheme } from 'vuetify'
  // Import CookieService for theme persistence
  import CookieService from '@/services/cookie.service'

  // Get the current theme instance
  const theme = useTheme()

  // On component mount, set the theme from cookie if available
  onMounted(() => {
    const savedTheme = CookieService.get('theme')
    // If a theme is saved and differs from the current, apply it
    if (savedTheme && savedTheme !== (theme.global.current.value.dark ? 'dark' : 'light')) {
      theme.global.name.value = savedTheme
    }
  })
</script>

<script lang="ts">
  // Define the App component for options API compatibility
  import { defineComponent } from 'vue'

  export default defineComponent({
    name: 'App', // Component name

    data () {
      return {
        // No local data properties
      }
    },
  })
</script>