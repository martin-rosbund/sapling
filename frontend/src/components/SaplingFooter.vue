<template>
  <!-- Footer with language and theme toggle buttons -->
  <v-footer app>
    <v-btn
      @click="toggleLanguage"
      variant="text">
    <v-img
      :src="currentLanguage === 'de' ? enFlag  : deFlag"
      width="24"
      height="24"
      cover/>
    </v-btn>
    <v-spacer></v-spacer>
    <v-btn
    :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
    @click="toggleTheme"
    variant="text"
    ></v-btn>
  </v-footer>
</template>

<script lang="ts" setup>
// #region Imports
// Import required modules and services
import CookieService from '@/services/cookie.service'; // Cookie service for managing cookies
import { ref } from 'vue'; // Vue composition API
import { useLocale, useTheme } from 'vuetify'; // Vuetify theme and locale
import { i18n } from '@/i18n'; // Internationalization instance
import deFlag from '@/assets/language/de-DE.png'; // German flag image
import enFlag from '@/assets/language/en-US.png'; // English flag image
// #endregion

// #region Theme & Locale
// Theme and locale instances
const theme = useTheme();
const locale = useLocale();
// #endregion

// #region State
// Current language state
const currentLanguage = ref(CookieService.get('language') || 'de-DE');
// #endregion

// #region Theme Toggle
// Toggle between dark and light theme
function toggleTheme() {
  if (theme.global.current.value.dark) {
    theme.change('light');
    CookieService.set('theme', 'light');
  } else {
    theme.change('dark');
    CookieService.set('theme', 'dark');
  }
}
// #endregion

// #region Language Toggle
// Toggle between German and English language
function toggleLanguage() {
  if (currentLanguage.value === 'de') {
    currentLanguage.value = 'en';
    CookieService.set('language', 'en');
    i18n.global.locale.value = 'en';
    locale.current.value = 'en'; // Switch Vuetify locale
  } else {
    currentLanguage.value = 'de';
    CookieService.set('language', 'de');
    i18n.global.locale.value = 'de';
    locale.current.value = 'de'; // Switch Vuetify locale
  }
}
// #endregion
</script>