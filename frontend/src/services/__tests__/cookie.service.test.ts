import { describe, expect, it } from 'vitest'

import CookieService from '../cookie.service'

describe('CookieService', () => {
  it('round-trips encoded cookie values', () => {
    CookieService.set('language', 'en-US / admin')

    expect(CookieService.get('language')).toBe('en-US / admin')
  })

  it('returns null for unknown cookies', () => {
    expect(CookieService.get('missing-cookie')).toBeNull()
  })

  it('deletes cookies by name', () => {
    CookieService.set('theme', 'dark')
    expect(CookieService.get('theme')).toBe('dark')

    CookieService.delete('theme')

    expect(CookieService.get('theme')).toBeNull()
  })
})
