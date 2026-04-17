import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useTranslationStore } from '../translationStore'

describe('useTranslationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks loaded entities', () => {
    const store = useTranslationStore()

    store.add('ticket')
    store.addMany(['company', 'person'])

    expect(store.has('ticket')).toBe(true)
    expect(store.has('company')).toBe(true)
    expect(store.has('missing')).toBe(false)
  })

  it('keeps entities when the language stays the same', () => {
    const store = useTranslationStore()
    store.add('ticket')

    store.setLanguage('de')

    expect(store.language).toBe('de')
    expect(store.has('ticket')).toBe(true)
  })

  it('clears loaded entities when the language changes', () => {
    const store = useTranslationStore()
    store.addMany(['ticket', 'company'])

    store.setLanguage('en')

    expect(store.language).toBe('en')
    expect(store.entities.size).toBe(0)
  })
})
