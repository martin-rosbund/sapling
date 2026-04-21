import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n'

describe('i18n configuration', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'de'
    i18n.global.setLocaleMessage('de', {})
    i18n.global.setLocaleMessage('en', {})
  })

  it('returns the translation key without emitting warnings for missing messages', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      expect(i18n.global.t('missing.translation.key')).toBe('missing.translation.key')
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('does not fall back to another locale when the current locale is missing a message', () => {
    i18n.global.setLocaleMessage('en', {
      'global.availableInEnglishOnly': 'Available in English only',
    })

    expect(i18n.global.t('global.availableInEnglishOnly')).toBe('global.availableInEnglishOnly')
  })
})
