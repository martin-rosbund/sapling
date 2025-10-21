import ApiGenericService from './api.generic.service';
import type { TranslationItem } from '@/entity/entity';
import { i18n } from '@/i18n'

class TranslationService {
  private language: string;
  private loadedEntities: Set<string>;

  constructor(language: string | null) {
    this.language = language || 'de';
    this.loadedEntities = new Set();
  }

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

  convertTranslations(translations: TranslationItem[]): Record<string, string> {
    const result: Record<string, string> = {}
    for (const entry of translations) {
      result[`${entry.entity}.${entry.property}`] = entry.value
    }
    return result
  }

  addLocaleMessages(newMessages: Record<string, string>) {
    const existing = i18n.global.getLocaleMessage(this.language) as Record<string, string>
    const merged = { ...existing, ...newMessages }
    i18n.global.setLocaleMessage(this.language, merged)
  }
}

export default TranslationService;