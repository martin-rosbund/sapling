import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { LanguageItem } from '../../entity/LanguageItem';
import languageData from './json/languageData.json';

export class LanguageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(LanguageItem);
    if (count === 0) {
      for (const l of languageData) {
        em.create(LanguageItem, l);
      }
    }
  }
}
