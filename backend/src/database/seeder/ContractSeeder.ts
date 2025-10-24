// Seeder for populating the database with initial Event data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { ContractItem } from 'src/entity/ContractItem';

export class ContractSeeder extends Seeder {
  /**
   * Runs the Contract seeder. If there are no Contracts, it creates them from the JSON data.
   * Each Contract is linked to a company, language, and role if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(ContractItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<ContractItem>('contractData');
      for (const p of data) {
        em.create(ContractItem, p);
      }
    }
  }
}
