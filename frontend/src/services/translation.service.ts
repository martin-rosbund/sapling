import ApiGenericService from './api.generic.service';
import type { TranslationItem } from '@/entity/entity';
import { i18n } from '@/i18n'


/**
 * Service for loading and managing translations for entities.
 */
class TranslationService {
  /** Language code for translations (e.g., 'en', 'de'). */
  private language: string;
  /** Set of entity names that have already been loaded. */
  private loadedEntities: Set<string>;

  /**
   * Creates a new TranslationService for a specific language.
   * @param language Language code (e.g., 'en', 'de').
   */
  constructor(language: string | null) {
    this.language = language || 'de';
    this.loadedEntities = new Set();
  }

  /**
   * Loads translations for one or more entities, if not already loaded.
   * @param entityName Names of the entities to load translations for.
   * @returns Promise resolving to the loaded TranslationItem array.
   */
  async prepare(...entityName: string[]): Promise<TranslationItem[]> {
    // Filter out already loaded entity names
    const toLoad = entityName.filter(name => !this.loadedEntities.has(name));
    if (toLoad.length === 0) {
      // All requested entities already loaded, return empty array
      return [];
    }
    const response = await ApiGenericService.find<TranslationItem>('translation', { entity: toLoad, language: this.language });
    const convertedResponse = this.convertTranslations(response.data);
    this.addLocaleMessages(convertedResponse);
    // Mark these entities as loaded
    toLoad.forEach(name => this.loadedEntities.add(name));
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
  addLocaleMessages(newMessages: Record<string, string>) {
    const existing = i18n.global.getLocaleMessage(this.language) as Record<string, string>
    const merged = { ...existing, ...newMessages }
    i18n.global.setLocaleMessage(this.language, merged)
  }
}

export default TranslationService;