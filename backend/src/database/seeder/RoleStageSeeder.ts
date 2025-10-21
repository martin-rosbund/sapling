// Seeder for populating the database with initial role stage data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { RoleStageItem } from 'src/entity/RoleStageItem';
import roleData from './json/roleStageData.json';

export class RoleStageSeeder extends Seeder {
  /**
   * Runs the role stage seeder. If there are no role stages, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RoleStageItem);
    if (count === 0) {
      for (const r of roleData) {
        em.create(RoleStageItem, r);
      }
    }
  }
}
