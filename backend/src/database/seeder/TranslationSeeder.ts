// Seeder for populating the database with initial translation data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from 'src/entity/LanguageItem';
import { TranslationItem } from 'src/entity/TranslationItem';
import { DatabaseSeeder } from './DatabaseSeeder';

type TranslationFileItem = {
  entity: string;
  property: string;
  de: string;
  en: string;
};

export class TranslationSeeder extends Seeder {
  /**
   * Runs the translation seeder. If there are no translations for 'login', it creates translations for DE and EN from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TranslationItem, { entity: 'login' });

    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<any>('translationData');
      const de = await em.findOne(LanguageItem, { handle: 'de' });
      const en = await em.findOne(LanguageItem, { handle: 'en' });

      if (de) {
        for (const t of data as TranslationFileItem[]) {
          em.create(TranslationItem, {
            ...t,
            value: t.de,
            language: de,
          });
        }
      }
      if (en) {
        for (const t of data as TranslationFileItem[]) {
          em.create(TranslationItem, {
            ...t,
            value: t.en,
            language: en,
          });
        }
      }
    }
  }
}
