import ApiService from './api.service';
import type { TranslationItem } from '@/entity/entity';

class TranslationService {
  private translationService = new ApiService<TranslationItem>('translation');
  private entityTranslations: Record<string, TranslationItem[]> = {};
  private language: string;

  constructor(language: string) {
    this.language = language;
  }

  translate(entityName: string, property: string): string {
    return this.entityTranslations[entityName]?.find(item => item.property === property)?.value || property;
  }

  async prepare(entityName: string): Promise<TranslationItem[]> {
      const response = await this.translationService.find(1, 1000, { entity: entityName, language: this.language });
      this.entityTranslations[entityName] = response.data;
      return response.data;
  }
}

export default TranslationService;