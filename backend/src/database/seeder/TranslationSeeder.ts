import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from 'src/entity/LanguageItem';
import { TranslationItem } from 'src/entity/TranslationItem';
import translations from './json/translationData.json';

export class TranslationSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TranslationItem, { entity: 'login' });

    if (count === 0) {
      const de = await em.findOne(LanguageItem, { handle: 'de' });
      const en = await em.findOne(LanguageItem, { handle: 'en' });

      if (de) {
        for (const t of translations) {
          em.create(TranslationItem, {
            entity: t.entity,
            property: t.property,
            value: t.de,
            language: de,
          });
        }
      }
      if (en) {
        for (const t of translations) {
          em.create(TranslationItem, {
            entity: t.entity,
            property: t.property,
            value: t.en,
            language: en,
          });
        }
      }
    }
  }
}
