import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { CompanyItem } from 'src/entity/CompanyItem';
import { LanguageItem } from 'src/entity/LanguageItem';

import { PersonItem } from 'src/entity/PersonItem';
import personData from './json/personData.json';

export class PersonSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(PersonItem);
    if (count === 0) {
      const company = await em.findOne(CompanyItem, { name: 'Standardfirma' });
      if (company) {
        for (const p of personData) {
          const language = await em.findOne(LanguageItem, {
            handle: p.languageHandle,
          });
          if (language) {
            em.create(PersonItem, {
              ...p,
              birthDay: new Date(p.birthDay),
              company: company,
              language: language,
            });
          }
        }
      }
    }
  }
}
