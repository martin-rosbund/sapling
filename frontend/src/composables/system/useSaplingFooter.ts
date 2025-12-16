// #region Imports
import { onMounted, ref } from 'vue'; // Import Vue's ref function for creating reactive variables
import CookieService from '@/services/cookie.service'; // Import a service for managing cookies
import { useLocale, useTheme } from 'vuetify'; // Import Vuetify composables for locale and theme management
import { i18n } from '@/i18n'; // Import the internationalization instance
import deFlag from '@/assets/language/de-DE.png'; // Import the German flag image
import enFlag from '@/assets/language/en-US.png'; // Import the English flag image
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants';
import ApiService from '@/services/api.service';
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher';
// #endregion

export function useSaplingFooter() {
  //#region State
  // Reactive property for the current theme
  const theme = useTheme();
  // Reactive property for the current locale
  const locale = useLocale();
  // Reactive property for the current language, initialized from a cookie or defaulting to German
  const currentLanguage = ref(CookieService.get('language') || 'de-DE');
  // Reactive property for the application version
  const version = ref('');
  // Reactive properties for flag images
  const windowWatcher = new SaplingWindowWatcher();
  // Reactive property to determine if actions should be shown inline based on window size
  const showActionsInline = ref(true);
  //#endregion

  //#region Window Watcher
  windowWatcher.onChange((size) => {
  if(size === 'small'){
      showActionsInline.value = false;
  } else {
      showActionsInline.value = true;
    }
  });
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    const result = await ApiService.findOne<{ version: string }>('version');
    version.value = result.version;
  });
  //#endregion

  //#region Theme Toggle
  // Function to toggle between light and dark themes
  function toggleTheme() {
    if (theme.global.current.value.dark) {
      theme.change('light'); // Change to light theme
      CookieService.set('theme', 'light'); // Save the theme preference in a cookie
    } else {
      theme.change('dark'); // Change to dark theme
      CookieService.set('theme', 'dark'); // Save the theme preference in a cookie
    }
  }
  //#endregion

  //#region Language Toggle
  // Function to toggle between German and English languages
  function toggleLanguage() {
    if (currentLanguage.value === 'de') {
      currentLanguage.value = 'en'; // Set the language to English
      CookieService.set('language', 'en'); // Save the language preference in a cookie
      i18n.global.locale.value = 'en'; // Update the i18n locale
      locale.current.value = 'en'; // Update the Vuetify locale
    } else {
      currentLanguage.value = 'de'; // Set the language to German
      CookieService.set('language', 'de'); // Save the language preference in a cookie
      i18n.global.locale.value = 'de'; // Update the i18n locale
      locale.current.value = 'de'; // Update the Vuetify locale
    }
  }
  //#endregion
  
  //#region Swagger
  // Function to open the Swagger documentation in a new tab
  const swagger = BACKEND_URL + 'swagger';
  function openSwagger() {
    window.open(swagger, '_blank');
  }
  //#endregion

  //#region Git
  // Function to open the Git repository in a new tab
  function openGit() {
    window.open(GIT_URL, '_blank');
  }
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    theme,
    locale,
    currentLanguage,
    deFlag,
    enFlag,
    version,
    showActionsInline,
    toggleTheme,
    toggleLanguage,
    openSwagger,
    openGit
  };
  //#endregion
}
