<template>
  <v-app class="sapling-no-select">
    <div class="bg-wrapper">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>
    <div id="sparkle-trail-container"></div>
    <v-main>
      <router-view/>
    </v-main>
    <!--<SaplingContextMenu />-->
  </v-app>
</template>

<script lang="ts" setup>
  // Import lifecycle hook und watch von Vue
  import { onMounted, onUnmounted, watch } from 'vue'
  // Import Vuetify's theme composable
  import { useTheme } from 'vuetify'
  // Import CookieService for theme persistence
  import CookieService from '@/services/cookie.service'
  // Import global styles for Sapling
  import '@/assets/styles/SaplingGlobal.css';
  // Import tilt styles for Sapling
  // import '@/assets/styles/SaplingMouse.css';

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

  // Sparkle Trail: Funken-Schweif
  function createSparkle(x: number, y: number) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';
    sparkle.style.background = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`;
    sparkle.style.boxShadow = `0 0 8px 2px #fff, 0 0 16px 4px #${Math.random()>0.5?'ffd700':'00bfff'}`;
    sparkle.style.transform = `scale(${Math.random() * 0.7 + 0.5}) rotate(${Math.random()*360}deg)`;
    const container = document.getElementById('sparkle-trail-container');
    if (container) {
      container.appendChild(sparkle);
      setTimeout(() => {
        sparkle.remove();
      }, 700 + Math.random()*400);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    createSparkle(e.clientX, e.clientY);
  }

  onMounted(() => {
    window.addEventListener('contextmenu', e => e.preventDefault())
    //window.addEventListener('mousemove', handleMouseMove);
  })

  onUnmounted(() => {
    window.removeEventListener('contextmenu', e => e.preventDefault())
    //window.removeEventListener('mousemove', handleMouseMove);
  })
</script>

<script lang="ts">
  // Define the App component for options API compatibility
  import { defineComponent } from 'vue'
  //import SaplingContextMenu from './components/context/SaplingContextMenu.vue';

  export default defineComponent({
    name: 'App', // Component name

    data () {
      return {
        // No local data properties
      }
    },
  })
</script>