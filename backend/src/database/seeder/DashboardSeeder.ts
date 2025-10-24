// Seeder for populating the database with initial role data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { DashboardItem } from 'src/entity/DashboardItem';

export class DashboardSeeder extends Seeder {
  /**
   * Runs the dashboard seeder. If there are no dashboards, it creates them from the JSON data.
   * Each dashboard is linked to its owner (person) if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(DashboardItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<DashboardItem>('dashboardData');
      for (const r of data) {
        em.create(DashboardItem, r);
      }
    }
  }
}
