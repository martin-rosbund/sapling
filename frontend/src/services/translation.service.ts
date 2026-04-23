import ApiGenericService from './api.generic.service'
import type { TranslationItem } from '@/entity/entity'
import { i18n } from '@/i18n'
import { useTranslationStore } from '@/stores/translationStore'

class TranslationService {
  async loadAllTranslations(
    entityHandle: string[],
    currentLanguage: string,
  ): Promise<TranslationItem[]> {
    const translations: TranslationItem[] = []
    let page = 1
    let totalPages = 1

    do {
      const response = await ApiGenericService.find<TranslationItem>('translation', {
        filter: {
          entity: { $in: entityHandle },
          language: currentLanguage,
        },
        page,
      })

      translations.push(...response.data)
      totalPages = Math.max(response.meta?.totalPages || 1, 1)
      page += 1
    } while (page <= totalPages)

    return translations
  }

  /**
   * Prepares translations for the specified entity handles.
   * Loads translations from the backend if they are not already loaded.
   * @param entityHandle Array of entity handles to load translations for.
   * @returns Promise resolving to an array of TranslationItem objects.
   */
  async prepare(...entityHandle: string[]): Promise<TranslationItem[]> {
    const translationStore = useTranslationStore()
    const currentLanguage = i18n.global.locale.value as string
    translationStore.setLanguage(currentLanguage)

    // Filter out empty strings from entityHandle
    const filteredEntityNames = entityHandle.filter((name) => name.trim() !== '')
    const toLoad = filteredEntityNames.filter((name) => !translationStore.has(name))
    if (toLoad.length === 0) {
      return []
    }
    const translations = await this.loadAllTranslations(toLoad, currentLanguage)
    const convertedResponse = this.convertTranslations(translations)
    this.addLocaleMessages(convertedResponse, currentLanguage)
    translationStore.addMany(toLoad)
    return translations
  }

  /**
   * Converts an array of TranslationItem objects to a key-value map.
   * @param translations Array of TranslationItem objects.
   * @returns Object mapping 'entity.property' to translation value.
   */
  convertTranslations(translations: TranslationItem[]): Record<string, string> {
    const result: Record<string, string> = {}
    for (const entry of translations) {
      result[`${entry.entity}.${entry.property}`] = entry.value
    }
    return result
  }

  /**
   * Adds new translation messages to the i18n locale messages.
   * @param newMessages Object containing new translation key-value pairs.
   */
  addLocaleMessages(newMessages: Record<string, string>, language: string) {
    const existing = i18n.global.getLocaleMessage(language) as Record<string, string>
    const merged = { ...existing, ...newMessages }
    i18n.global.setLocaleMessage(language, merged)
  }
}

export default TranslationService
