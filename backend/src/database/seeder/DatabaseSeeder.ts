import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageSeeder } from './LanguageSeeder';
import { TranslationSeeder } from './TranslationSeeder';
import { CompanySeeder } from './CompanySeeder';
import { PersonSeeder } from './PersonSeeder';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [
      LanguageSeeder,
      TranslationSeeder,
      CompanySeeder,
      PersonSeeder,
    ]);
  }
}
