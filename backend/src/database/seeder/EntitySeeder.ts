import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { EntityItem } from 'src/entity/EntityItem';
import entityData from './json/entityData.json';

export class EntitySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityItem);
    if (count === 0) {
      for (const e of entityData) {
        em.create(EntityItem, e);
      }
    }
  }
}
