// Seeder for populating the database with initial entity group data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import entityData from './json/entityGroupData.json';
import { EntityGroupItem } from 'src/entity/EntityGroupItem';

export class EntityGroupSeeder extends Seeder {
  /**
   * Runs the entity group seeder. If there are no groups, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityGroupItem);
    if (count === 0) {
      for (const e of entityData) {
        em.create(EntityGroupItem, e);
      }
    }
  }
}
