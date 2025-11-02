import { ref } from 'vue';
import CookieService from '@/services/cookie.service';
import { useLocale, useTheme } from 'vuetify';
import { i18n } from '@/i18n';
import deFlag from '@/assets/language/de-DE.png';
import enFlag from '@/assets/language/en-US.png';

export function useSaplingFooter() {
  const theme = useTheme();
  const locale = useLocale();
  const currentLanguage = ref(CookieService.get('language') || 'de-DE');

  function toggleTheme() {
    if (theme.global.current.value.dark) {
      theme.change('light');
      CookieService.set('theme', 'light');
    } else {
      theme.change('dark');
      CookieService.set('theme', 'dark');
    }
  }

  function toggleLanguage() {
    if (currentLanguage.value === 'de') {
      currentLanguage.value = 'en';
      CookieService.set('language', 'en');
      i18n.global.locale.value = 'en';
      locale.current.value = 'en';
    } else {
      currentLanguage.value = 'de';
      CookieService.set('language', 'de');
      i18n.global.locale.value = 'de';
      locale.current.value = 'de';
    }
  }

  return {
    theme,
    locale,
    currentLanguage,
    deFlag,
    enFlag,
    toggleTheme,
    toggleLanguage,
  };
}
