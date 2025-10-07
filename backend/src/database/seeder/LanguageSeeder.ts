import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from '../../entity/LanguageItem';

export class LanguageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(LanguageItem);

    if (count === 0) {
      em.create(LanguageItem, {
        handle: 'de',
        name: 'Deutsch (Deutschland)',
      });
      em.create(LanguageItem, {
        handle: 'en',
        name: 'Englisch (USA)',
      });
    }
  }
}
