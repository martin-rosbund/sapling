// Seeder for populating the database with initial person data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { CompanyItem } from 'src/entity/CompanyItem';
import { LanguageItem } from 'src/entity/LanguageItem';

import { PersonItem } from 'src/entity/PersonItem';
import personData from './json/personData.json';
import { RoleItem } from 'src/entity/RoleItem';

export class PersonSeeder extends Seeder {
  /**
   * Runs the person seeder. If there are no persons, it creates them from the JSON data.
   * Each person is linked to a company, language, and role if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(PersonItem);
    if (count === 0) {
      const company = await em.findOne(CompanyItem, { name: 'Standardfirma' });
      const role = await em.findOne(RoleItem, { handle: 1 });
      if (company && role) {
        for (const p of personData) {
          const language = await em.findOne(LanguageItem, {
            handle: p.language,
          });
          if (language) {
            em.create(PersonItem, {
              ...p,
              birthDay: new Date(p.birthDay),
              company: company,
              language: language,
              roles: [role],
            });
          }
        }
      }
    }
  }
}
