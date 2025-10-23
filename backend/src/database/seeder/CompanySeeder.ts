// Seeder for populating the database with initial company data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { CompanyItem } from 'src/entity/CompanyItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class CompanySeeder extends Seeder {
  /**
   * Runs the company seeder. If there are no companies, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(CompanyItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<CompanyItem>('companyData');
      for (const c of data) {
        em.create(CompanyItem, c);
      }
    }
  }
}
