import { createI18n } from 'vue-i18n'
import CookieService from './services/cookie.service'

export const i18n = createI18n({
  legacy: false,
  locale: CookieService.get('language') || 'de',
  fallbackLocale: 'en',
  messages: {},
})