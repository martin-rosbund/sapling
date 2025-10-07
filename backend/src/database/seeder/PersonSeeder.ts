import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { CompanyItem } from 'src/entity/CompanyItem';
import { LanguageItem } from 'src/entity/LanguageItem';
import { PersonItem } from 'src/entity/PersonItem';

export class PersonSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(PersonItem);

    if (count === 0) {
      const company = await em.findOne(CompanyItem, { name: 'Standardfirma' });
      const de = await em.findOne(LanguageItem, { handle: 'de' });
      const en = await em.findOne(LanguageItem, { handle: 'en' });

      if (company) {
        if (de) {
          em.create(PersonItem, {
            firstName: 'Max',
            lastName: 'Mustermann',
            loginName: 'max',
            loginPassword:
              '$2b$10$4td2O3aRFNFXtRQhb3TeWuaJoOEYdkDoa.TkIZJzbxgV7.ilRs9Pm',
            email: 'max.mustermann@example.com',
            phone: '01234 567890',
            mobile: '01234 567891',
            birthDay: new Date('1990-09-23'),
            requirePasswordChange: false,
            isActive: true,
            company: company,
            language: de,
          });
        }

        if (en) {
          em.create(PersonItem, {
            firstName: 'Lisa',
            lastName: 'Musterfrau',
            loginName: 'lisa',
            loginPassword:
              '$2b$10$2ta6LveIqt1Vf/HiVRjIleXXrKs1Bzk3cRh3jfsOpsTqaVGCNsr.i',
            email: 'lisa.musterfrau@example.com',
            phone: '01234 567890',
            mobile: '01234 567891',
            birthDay: new Date('1990-09-23'),
            requirePasswordChange: true,
            isActive: true,
            company: company,
            language: en,
          });
        }
      }
    }
  }
}
