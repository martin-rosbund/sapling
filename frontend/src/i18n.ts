// Import the createI18n function from vue-i18n
import { createI18n } from 'vue-i18n'
// Import the CookieService to get the user's language preference
import CookieService from './services/cookie.service'

// Create and export the i18n instance for internationalization
export const i18n = createI18n({
  legacy: false, // Use the Composition API mode
  locale: CookieService.get('language') || 'de', // Set the initial locale from cookie or default to German
  fallbackLocale: 'en', // Fallback to English if translation is missing
  messages: {
    // Translation messages will be added here
  }
})