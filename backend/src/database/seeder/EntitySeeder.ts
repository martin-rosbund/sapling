// Seeder for populating the database with initial entity data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from 'src/entity/EntityItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class EntitySeeder extends Seeder {
  /**
   * Runs the entity seeder. If there are no entities, it creates them from the JSON data.
   * Each entity is linked to its group if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityItem);

    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<EntityItem>('entityData');
      for (const e of data) {
        em.create(EntityItem, e);
      }
    }
  }
}
