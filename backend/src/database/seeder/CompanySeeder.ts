import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { CompanyItem } from 'src/entity/CompanyItem';

export class CompanySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(CompanyItem);

    if (count === 0) {
        em.create(CompanyItem, { name: 'Standardfirma', street: 'Musterstraße 1', zip: '12345', city: 'Musterstadt', phone: '01234 567890', email: 'info@standardfirma.de', website: 'www.standardfirma.de' });
    }
  }
}