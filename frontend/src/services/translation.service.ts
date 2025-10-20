import ApiGenericService from './api.generic.service';
import type { TranslationItem } from '@/entity/entity';
import { i18n } from '@/i18n'

class TranslationService {
  private language: string;

  constructor(language: string | null) {
    this.language = language || 'de';
  }

  async prepare(...entityName: string[]): Promise<TranslationItem[]> {
      const response = await ApiGenericService.find<TranslationItem>('translation', { entity: entityName, language: this.language });
      const convertedResponse = this.convertTranslations(response.data);
      this.addLocaleMessages(convertedResponse);
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
    console.log(merged);
  }
}

export default TranslationService;