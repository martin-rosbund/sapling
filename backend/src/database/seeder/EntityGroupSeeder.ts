import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import entityData from './json/entityGroupData.json';
import { EntityGroupItem } from 'src/entity/EntityGroupItem';

export class EntityGroupSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityGroupItem);
    if (count === 0) {
      for (const e of entityData) {
        em.create(EntityGroupItem, e);
      }
    }
  }
}
