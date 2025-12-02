<template>
  <v-app>
    <div class="bg-wrapper">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>
    <v-main>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  // Import lifecycle hook und watch von Vue
  import { onMounted, watch } from 'vue'
  // Import Vuetify's theme composable
  import { useTheme } from 'vuetify'
  // Import CookieService for theme persistence
  import CookieService from '@/services/cookie.service'
  // Import global styles for Sapling
  import '@/assets/styles/SaplingGlobal.css';

  // Dynamisches Laden der Theme-CSS je nach aktuellem Theme
  function loadThemeCss(themeName: string) {
    const darkHref = '/src/assets/styles/SaplingTiltDark.css';
    const lightHref = '/src/assets/styles/SaplingTiltLight.css';

    // Entferne existierende Theme-Stylesheets
    document.querySelectorAll('link[data-sapling-theme]').forEach(el => el.remove());
    
    // Füge das passende Theme-Stylesheet hinzu
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.setAttribute('data-sapling-theme', 'true');
    link.href = themeName === 'dark' ? darkHref : lightHref;
    document.head.appendChild(link);
  }

  // Get the current theme instance
  const theme = useTheme()
  // On component mount, set the theme from cookie if available
  onMounted(() => {
    const savedTheme = CookieService.get('theme');
    // Setze Theme aus Cookie, falls vorhanden
    if (savedTheme && savedTheme !== (theme.global.current.value.dark ? 'dark' : 'light')) {
      theme.global.name.value = savedTheme;
    }

    // Lade das passende Theme-CSS
    loadThemeCss(theme.global.current.value.dark ? 'dark' : 'light');
    // Beobachte Theme-Wechsel
    if (theme.global.name.value) {
      watch(
        () => theme.global.name.value,
        (newTheme: string) => {
          loadThemeCss(newTheme);
        }
      );
    }
  });
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