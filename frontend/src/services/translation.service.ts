import ApiGenericService from './api.generic.service';
import type { TranslationItem } from '@/entity/entity';
import { i18n } from '@/i18n'
import { useLoadedEntitiesStore } from '@/stores/loadedTranslations'

class TranslationService {
  /**
   * Prepares translations for the specified entity names.
   * Loads translations from the backend if they are not already loaded.
   * @param entityName Array of entity names to load translations for.
   * @returns Promise resolving to an array of TranslationItem objects.
   */
  async prepare(...entityName: string[]): Promise<TranslationItem[]> {
    const loadedEntitiesStore = useLoadedEntitiesStore();
    const currentLanguage = i18n.global.locale.value as string;
    loadedEntitiesStore.setLanguage(currentLanguage);

    const toLoad = entityName.filter(name => !loadedEntitiesStore.has(name));
    if (toLoad.length === 0) {
      return [];
    }
    const response = await ApiGenericService.find<TranslationItem>('translation', { entity: toLoad, language: currentLanguage });
    const convertedResponse = this.convertTranslations(response.data);
    this.addLocaleMessages(convertedResponse, currentLanguage);
    loadedEntitiesStore.addMany(toLoad);
    return response.data;
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

export default TranslationService;