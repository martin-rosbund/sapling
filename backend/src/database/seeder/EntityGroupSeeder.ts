// Seeder for populating the database with initial entity group data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityGroupItem } from 'src/entity/EntityGroupItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class EntityGroupSeeder extends Seeder {
  /**
   * Runs the entity group seeder. If there are no groups, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityGroupItem);
    if (count === 0) {
      const data =
        DatabaseSeeder.loadJsonData<EntityGroupItem>('entityGroupData');
      for (const e of data) {
        em.create(EntityGroupItem, e);
      }
    }
  }
}
