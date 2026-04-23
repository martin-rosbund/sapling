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
  function createPaginatedResponse(data: TranslationItem[], page = 1, totalPages = 1) {
    return {
      data,
      meta: {
        total: data.length,
        page,
        limit: 100,
        totalPages,
        executionTime: 0,
      },
    }
  }

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
    findMock.mockResolvedValue(createPaginatedResponse(response))
    i18n.global.setLocaleMessage('de', { existing: 'Vorhanden' })

    const service = new TranslationService()
    const result = await service.prepare('ticket', ' ', 'company')

    expect(findMock).toHaveBeenCalledWith('translation', {
      filter: {
        entity: { $in: ['ticket', 'company'] },
        language: 'de',
      },
      page: 1,
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

  it('loads all translation pages when the metadata reports more results', async () => {
    const firstPage: TranslationItem[] = [
      { entity: 'ticket', property: 'title', value: 'Ticket' },
    ] as TranslationItem[]
    const secondPage: TranslationItem[] = [
      { entity: 'ticket', property: 'description', value: 'Beschreibung' },
    ] as TranslationItem[]

    findMock
      .mockResolvedValueOnce(createPaginatedResponse(firstPage, 1, 2))
      .mockResolvedValueOnce(createPaginatedResponse(secondPage, 2, 2))

    const service = new TranslationService()
    const result = await service.prepare('ticket')

    expect(findMock).toHaveBeenNthCalledWith(1, 'translation', {
      filter: {
        entity: { $in: ['ticket'] },
        language: 'de',
      },
      page: 1,
    })
    expect(findMock).toHaveBeenNthCalledWith(2, 'translation', {
      filter: {
        entity: { $in: ['ticket'] },
        language: 'de',
      },
      page: 2,
    })
    expect(result).toEqual([...firstPage, ...secondPage])
    expect(i18n.global.getLocaleMessage('de')).toEqual({
      'ticket.title': 'Ticket',
      'ticket.description': 'Beschreibung',
    })
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
