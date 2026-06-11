import { createI18n } from 'vue-i18n'
import CookieService from './services/cookie.service'

const initialMessages: Record<string, Record<string, string>> = {
  de: {},
  en: {},
}

function hideMissingTranslation(_locale: string, _key: string) {
  void _locale
  void _key
  return ''
}

export const i18n = createI18n({
  legacy: false,
  locale: CookieService.get('language') || 'de',
  fallbackLocale: false,
  missingWarn: false,
  fallbackWarn: false,
  missing: hideMissingTranslation,
  messages: initialMessages,
})
