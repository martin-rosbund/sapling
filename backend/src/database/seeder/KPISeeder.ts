// Seeder for populating the database with initial KPI data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { KPIItem } from 'src/entity/KPIItem';

export class KPISeeder extends Seeder {
  /**
   * Runs the KPI seeder. If there are no KPIs, it creates them from the JSON data.
   * Each KPI is linked to its target entity if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(KPIItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<KPIItem>('kpiData');
      for (const r of data) {
        em.create(KPIItem, r);
      }
    }
  }
}
