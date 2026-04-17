import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { TranslationItem } from '@/entity/entity'
import { i18n } from '@/i18n'
import { useTranslationStore } from '@/stores/translationStore'

const { findMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
}))

vi.mock('../api.generic.service', () => ({
  default: {
    find: findMock,
  },
}))

import TranslationService from '../translation.service'

describe('TranslationService', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    findMock.mockReset()
    i18n.global.locale.value = 'de'
    i18n.global.setLocaleMessage('de', {})
    i18n.global.setLocaleMessage('en', {})
  })

  it('returns early when all requested entities are already loaded', async () => {
    const store = useTranslationStore()
    store.add('ticket')

    const service = new TranslationService()
    const result = await service.prepare('ticket')

    expect(result).toEqual([])
    expect(findMock).not.toHaveBeenCalled()
  })

  it('loads missing translations, filters blank names, and merges locale messages', async () => {
    const response: TranslationItem[] = [
      { entity: 'ticket', property: 'title', value: 'Ticket' },
      { entity: 'company', property: 'name', value: 'Firma' },
    ] as TranslationItem[]
    findMock.mockResolvedValue({ data: response })
    i18n.global.setLocaleMessage('de', { existing: 'Vorhanden' })

    const service = new TranslationService()
    const result = await service.prepare('ticket', ' ', 'company')

    expect(findMock).toHaveBeenCalledWith('translation', {
      filter: {
        entity: { $in: ['ticket', 'company'] },
        language: 'de',
      },
    })
    expect(result).toEqual(response)
    expect(i18n.global.getLocaleMessage('de')).toEqual({
      existing: 'Vorhanden',
      'ticket.title': 'Ticket',
      'company.name': 'Firma',
    })
    expect(useTranslationStore().has('ticket')).toBe(true)
    expect(useTranslationStore().has('company')).toBe(true)
  })

  it('converts backend entries into locale message keys', () => {
    const service = new TranslationService()

    expect(
      service.convertTranslations([
        { entity: 'ticket', property: 'title', value: 'Ticket' },
      ] as TranslationItem[]),
    ).toEqual({ 'ticket.title': 'Ticket' })
  })
})
